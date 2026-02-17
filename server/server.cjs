"use strict";

/**
 * server.cjs - Vendor Management Portal Backend (Express + MSSQL)
 * -------------------------------------------------------------
 * UPDATED: New grading system with reviewer assignments, per-section
 * ratings (Site/Procurement/Financial), and grade computation.
 */

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sql = require("mssql");

const { Client } = require("@microsoft/microsoft-graph-client");
const { ClientSecretCredential } = require("@azure/identity");
require("isomorphic-fetch");

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, "certs", "mydomain.key")),
  cert: fs.readFileSync(path.join(__dirname, "certs", "d466aacf3db3f299.crt")),
  ca: fs.readFileSync(path.join(__dirname, "certs", "gd_bundle-g2-g1.crt")),
};

/* ========================= Constants ========================= */

const ADMIN_EMAILS = String(
  process.env.ADMIN_EMAILS ||
    "aarnav.singh@premierenergies.com,nilesh.gaidhane@premierenergies.com,msudhir@premierenergies.com,sivasankar.g@premierenergies.com"
)
  .split(/[;,]/)
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_EMAIL = ADMIN_EMAILS[0];
const DUE_DILIGENCE_EMAIL = "duediligence@premierenergies.com";

const DEFAULT_DOCUMENTS = [
  "Certificate of Incorporation",
  "GST Certificate",
  "PAN Card",
  "MSME Certificate",
  "Cancelled Cheque",
  "Last Three year Financial reports",
  "Memorandum of Association (MOA)",
  "Article of Association (AOA)",
  "Last year GSTR Filings",
  "PO attachments",
];

const COOKIE_NAME = String(process.env.COOKIE_NAME || "vmp_session");
const JWT_SECRET = String(
  process.env.JWT_SECRET || "CHANGE_ME__SET_JWT_SECRET"
);
const COOKIE_SECURE =
  String(process.env.COOKIE_SECURE || "true").toLowerCase() === "true";

const APP_PORT = Number(process.env.PORT || 26443);
const APP_HOST = String(process.env.HOST || "0.0.0.0");

/* ========================= Grading Parameters (mirrored from frontend) ========================= */

const GRADING_SECTIONS = ["site", "procurement", "financial"];

const SITE_PARAMS = [
  { key: "material_timely_delivery", weight: 10 },
  { key: "support_at_site", weight: 7 },
  { key: "execution_time", weight: 7 },
  { key: "safety_compliance", weight: 7 },
  { key: "workmanship_quality", weight: 7 },
  { key: "planning_coordination", weight: 3 },
  { key: "responsiveness_rectification", weight: 4 },
];

const PROCUREMENT_PARAMS = [
  { key: "timely_response_rfq", weight: 5 },
  { key: "negotiation_approach", weight: 5 },
  { key: "data_sharing", weight: 5 },
  { key: "flexibility_payment_terms", weight: 5 },
  { key: "timely_lc_bg_submission", weight: 5 },
  { key: "no_delivery_hold_payment", weight: 3 },
  { key: "contractual_compliance", weight: 2 },
];

const FINANCIAL_PARAMS = [
  { key: "revenue_trend", weight: 6 },
  { key: "profitability_trend", weight: 6 },
  { key: "liquidity_position", weight: 5 },
  { key: "debt_solvency", weight: 4 },
  { key: "cash_flow_health", weight: 4 },
];

function getParamsForSection(section) {
  switch (section) {
    case "site":
      return SITE_PARAMS;
    case "procurement":
      return PROCUREMENT_PARAMS;
    case "financial":
      return FINANCIAL_PARAMS;
    default:
      return [];
  }
}

function computeSectionScore(section, ratings) {
  const params = getParamsForSection(section);
  let score = 0;
  for (const p of params) {
    const rating = Number(ratings[p.key] || 0);
    score += (rating / 5) * p.weight;
  }
  return Math.round(score * 100) / 100;
}

function getGradeForScore(score) {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  return "D";
}

/* ========================= Microsoft Graph (OTP Email) ========================= */

const CLIENT_ID = "3d310826-2173-44e5-b9a2-b21e940b67f7";
const TENANT_ID = "1c3de7f3-f8d1-41d3-8583-2517cf3ba3b1";
const CLIENT_SECRET = "2e78Q~yX92LfwTTOg4EYBjNQrXrZ2z5di1Kvebog";
const SENDER_EMAIL = "spot@premierenergies.com";

const credential = new ClientSecretCredential(
  TENANT_ID,
  CLIENT_ID,
  CLIENT_SECRET
);

const graphClient = Client.initWithMiddleware({
  authProvider: {
    getAccessToken: async () => {
      const tokenResponse = await credential.getToken(
        "https://graph.microsoft.com/.default"
      );
      return tokenResponse.token;
    },
  },
});

const APP_NAME = process.env.APP_NAME || "Vendor Management Portal";
const EMAILS_DISABLED =
  String(process.env.VMP_DISABLE_EMAILS || "").toLowerCase() === "true";

function emailTemplate({
  title,
  paragraphs = [],
  highlight = "",
  footerNote = "",
}) {
  return `
<div style="font-family:Arial,sans-serif;color:#333;line-height:1.45;background:#f6f7f9;padding:24px;">
  <div style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #e6e8eb;border-radius:8px;overflow:hidden;">
    <div style="background:#0b5fff;color:#fff;padding:14px 18px;font-weight:600;">
      ${title}
    </div>
    <div style="padding:20px;">
      ${paragraphs.map((p) => `<p style="margin:0 0 12px;">${p}</p>`).join("")}
      ${
        highlight
          ? `
      <div style="font-size:16px;letter-spacing:0.5px;font-weight:700;background:#f0f4ff;border:1px dashed #b9c7ff;border-radius:8px;padding:12px 16px;text-align:center;margin-top:10px;">
        ${highlight}
      </div>`
          : ""
      }
      ${
        footerNote
          ? `<p style="margin:14px 0 0;font-size:12px;color:#666;">${footerNote}</p>`
          : ""
      }
      <p style="margin:18px 0 0;">Regards,<br/><b>Team ${APP_NAME}</b></p>
    </div>
  </div>
  <div style="max-width:720px;margin:10px auto 0;text-align:center;color:#99a1ab;font-size:12px;">
    This is an automated message from ${APP_NAME}.
  </div>
</div>`;
}

async function sendEmail(toEmail, subject, htmlContent, ccEmail = []) {
  const toList = Array.isArray(toEmail)
    ? toEmail
    : String(toEmail || "")
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean);

  const ccList = Array.isArray(ccEmail)
    ? ccEmail
    : String(ccEmail || "")
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean);

  const normalizedTo = toList
    .map((x) =>
      String(x || "")
        .trim()
        .toLowerCase()
    )
    .filter((x) => x.includes("@"));

  const normalizedCc = ccList
    .map((x) =>
      String(x || "")
        .trim()
        .toLowerCase()
    )
    .filter((x) => x.includes("@"));

  const message = {
    subject,
    body: { contentType: "HTML", content: htmlContent },
    toRecipients: normalizedTo.map((addr) => ({
      emailAddress: { address: addr },
    })),
    ccRecipients: normalizedCc.map((addr) => ({
      emailAddress: { address: addr },
    })),
  };

  if (EMAILS_DISABLED) {
    console.log("[EMAIL DISABLED] Would send email:", {
      to: normalizedTo,
      cc: normalizedCc,
      subject,
    });
    return;
  }

  await graphClient.api(`/users/${SENDER_EMAIL}/sendMail`).post({
    message,
    saveToSentItems: true,
  });
}

async function sendOtpEmail(toEmail, otp, expiresMinutes = 10) {
  const safeTo = String(toEmail || "")
    .trim()
    .toLowerCase();
  if (!safeTo || !safeTo.includes("@")) throw new Error("INVALID_TO_EMAIL");

  const subject = `${APP_NAME}, OTP`;
  const html = emailTemplate({
    title: `🔐 ${APP_NAME}, OTP`,
    paragraphs: [
      "Hello,",
      `Use the following code to continue signing in to <b>${APP_NAME}</b>:`,
      `Enter this OTP on the login screen to proceed.`,
    ],
    highlight: `<span style="font-size:22px;letter-spacing:3px;">${otp}</span>`,
    footerNote: `This code is valid for ${expiresMinutes} minutes. If you did not request this, you can ignore this email.`,
  });

  await sendEmail(safeTo, subject, html);
}

/** Send email to reviewer when assigned */
async function sendReviewerAssignmentEmail(
  reviewerEmail,
  vendorName,
  sectionType
) {
  const sectionLabel =
    sectionType === "site"
      ? "Site Performance"
      : sectionType === "procurement"
      ? "Procurement Performance"
      : "Financial Performance";

  const subject = `${APP_NAME} — Review Assignment: ${vendorName}`;
  const html = emailTemplate({
    title: `📋 Review Assignment`,
    paragraphs: [
      "Hello,",
      `You have been assigned to review <b>${sectionLabel}</b> for vendor <b>${vendorName}</b>.`,
      `Please log in to the ${APP_NAME} to complete your review.`,
    ],
    footerNote: `Please rate all parameters in the ${sectionLabel} section using the 1–5 rating scale.`,
  });

  try {
    await sendEmail(reviewerEmail, subject, html);
  } catch (e) {
    console.error("Failed to send reviewer assignment email:", e);
  }
}

/* ========================= MSSQL Config ========================= */

const dbConfig = {
  user: process.env.DB_USER || "PEL_DB",
  password: process.env.DB_PASSWORD || "V@aN3#@VaN",
  server: process.env.DB_SERVER || "10.0.50.17",
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME || "vendors",
  requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT || 100000),
  connectionTimeout: Number(process.env.DB_CONNECTION_TIMEOUT || 10000000),
  pool: {
    max: Number(process.env.DB_POOL_MAX || 10),
    min: Number(process.env.DB_POOL_MIN || 0),
    idleTimeoutMillis: Number(process.env.DB_POOL_IDLE || 300000),
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

/* ========================= DB Helpers ========================= */

let poolPromise = null;

async function getPool() {
  if (!poolPromise) {
    poolPromise = sql
      .connect(dbConfig)
      .then((p) => p)
      .catch((err) => {
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}

function isGuid(v) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    String(v || "")
  );
}

async function execQuery(query, params = {}) {
  const pool = await getPool();
  const req = pool.request();

  for (const [key, val] of Object.entries(params)) {
    if (typeof val === "string" && val.length > 4000) {
      req.input(key, sql.NVarChar(sql.MAX), val);
    } else if (val === null || val === undefined) {
      req.input(key, val);
    } else {
      req.input(key, val);
    }
  }

  const res = await req.query(query);
  return res;
}

async function initSchema() {
  const q = `
IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Users (
    Email NVARCHAR(320) NOT NULL PRIMARY KEY,
    IsAdmin BIT NOT NULL DEFAULT(0),
    IsDueDiligence BIT NOT NULL DEFAULT(0),
    OtpHash NVARCHAR(128) NULL,
    OtpExpiry DATETIME2 NULL,
    Verified BIT NOT NULL DEFAULT(0),
    CreatedAt DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    UpdatedAt DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
  );
END;

IF OBJECT_ID('dbo.Vendors', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Vendors (
    VendorId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    Email NVARCHAR(320) NOT NULL,
    CompanyName NVARCHAR(512) NULL,
    CompletionPercentage INT NOT NULL DEFAULT(0),
    Submitted BIT NOT NULL DEFAULT(0),
    SubmittedAt DATETIME2 NULL,
    VendorJson NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    UpdatedAt DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
  );
  CREATE INDEX IX_Vendors_Email ON dbo.Vendors(Email);
  CREATE INDEX IX_Vendors_Submitted ON dbo.Vendors(Submitted);
END;

IF OBJECT_ID('dbo.ScoringMatrix', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.ScoringMatrix (
    MatrixId NVARCHAR(64) NOT NULL PRIMARY KEY,
    CompanyDetailsWeight INT NOT NULL,
    FinancialDetailsWeight INT NOT NULL,
    BankDetailsWeight INT NOT NULL,
    ReferencesWeight INT NOT NULL,
    DocumentsWeight INT NOT NULL,
    UpdatedAt DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
  );
END;

IF OBJECT_ID('dbo.VendorClassifications', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.VendorClassifications (
    VendorId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    VendorType NVARCHAR(32) NULL,
    OpexSubType NVARCHAR(64) NULL,
    CapexSubType NVARCHAR(64) NULL,
    CapexBand NVARCHAR(64) NULL,
    CompanyDetailsScore INT NOT NULL DEFAULT(0),
    FinancialDetailsScore INT NOT NULL DEFAULT(0),
    BankDetailsScore INT NOT NULL DEFAULT(0),
    ReferencesScore INT NOT NULL DEFAULT(0),
    DocumentsScore INT NOT NULL DEFAULT(0),
    TotalScore INT NOT NULL DEFAULT(0),
    Notes NVARCHAR(MAX) NULL,
    DueDiligenceSent BIT NOT NULL DEFAULT(0),
    DueDiligenceDate DATETIME2 NULL,
    InfoRequestSent BIT NOT NULL DEFAULT(0),
    InfoRequestDate DATETIME2 NULL,
    UpdatedAt DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
  );
  CREATE INDEX IX_Classifications_TotalScore ON dbo.VendorClassifications(TotalScore DESC);
END;

IF OBJECT_ID('dbo.DueDiligenceVerifications', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.DueDiligenceVerifications (
    VendorId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    CompanyDetailsVerified BIT NOT NULL DEFAULT(0),
    CompanyDetailsComment NVARCHAR(MAX) NULL,
    FinancialDetailsVerified BIT NOT NULL DEFAULT(0),
    FinancialDetailsComment NVARCHAR(MAX) NULL,
    BankDetailsVerified BIT NOT NULL DEFAULT(0),
    BankDetailsComment NVARCHAR(MAX) NULL,
    ReferencesVerified BIT NOT NULL DEFAULT(0),
    ReferencesComment NVARCHAR(MAX) NULL,
    DocumentsVerified BIT NOT NULL DEFAULT(0),
    DocumentsComment NVARCHAR(MAX) NULL,
    OverallStatus NVARCHAR(32) NOT NULL DEFAULT('pending'),
    AssignedAt DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    CompletedAt DATETIME2 NULL,
    VerifiedBy NVARCHAR(320) NULL,
    UpdatedAt DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
  );
  CREATE INDEX IX_DD_Status ON dbo.DueDiligenceVerifications(OverallStatus);
END;

-- ============ NEW GRADING SYSTEM TABLES ============

IF OBJECT_ID('dbo.ReviewerAssignments', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.ReviewerAssignments (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    VendorId UNIQUEIDENTIFIER NOT NULL,
    SectionType NVARCHAR(32) NOT NULL,
    ReviewerEmail NVARCHAR(320) NOT NULL,
    AssignedBy NVARCHAR(320) NOT NULL,
    AssignedAt DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    CONSTRAINT UQ_ReviewerAssignment UNIQUE(VendorId, SectionType, ReviewerEmail)
  );
  CREATE INDEX IX_RA_Vendor ON dbo.ReviewerAssignments(VendorId);
  CREATE INDEX IX_RA_Reviewer ON dbo.ReviewerAssignments(ReviewerEmail);
END;

IF OBJECT_ID('dbo.VendorRatings', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.VendorRatings (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    VendorId UNIQUEIDENTIFIER NOT NULL,
    SectionType NVARCHAR(32) NOT NULL,
    ParameterKey NVARCHAR(64) NOT NULL,
    Rating INT NOT NULL CHECK(Rating >= 1 AND Rating <= 5),
    RatedBy NVARCHAR(320) NOT NULL,
    RatedAt DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
    CONSTRAINT UQ_VendorRating UNIQUE(VendorId, SectionType, ParameterKey, RatedBy)
  );
  CREATE INDEX IX_VR_Vendor ON dbo.VendorRatings(VendorId);
  CREATE INDEX IX_VR_Reviewer ON dbo.VendorRatings(RatedBy);
END;

IF OBJECT_ID('dbo.VendorGrades', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.VendorGrades (
    VendorId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    SiteScore DECIMAL(10,2) NOT NULL DEFAULT(0),
    ProcurementScore DECIMAL(10,2) NOT NULL DEFAULT(0),
    FinancialScore DECIMAL(10,2) NOT NULL DEFAULT(0),
    TotalScore DECIMAL(10,2) NOT NULL DEFAULT(0),
    ComputedGrade NVARCHAR(1) NULL,
    AdminOverrideGrade NVARCHAR(1) NULL,
    FinalGrade NVARCHAR(1) NULL,
    ComputedAt DATETIME2 NULL,
    OverriddenBy NVARCHAR(320) NULL,
    OverriddenAt DATETIME2 NULL,
    UpdatedAt DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
  );
  CREATE INDEX IX_VG_FinalGrade ON dbo.VendorGrades(FinalGrade);
  CREATE INDEX IX_VG_TotalScore ON dbo.VendorGrades(TotalScore DESC);
END;
  `;

  await execQuery(q);

  // Ensure default scoring matrix exists (legacy)
  const existing = await execQuery(
    "SELECT TOP 1 MatrixId FROM dbo.ScoringMatrix WHERE MatrixId=@id",
    { id: "default" }
  );
  if (!existing.recordset || existing.recordset.length === 0) {
    await execQuery(
      `INSERT INTO dbo.ScoringMatrix
(MatrixId, CompanyDetailsWeight, FinancialDetailsWeight, BankDetailsWeight, ReferencesWeight, DocumentsWeight)
VALUES (@id, @cd, @fd, @bd, @ref, @doc)`,
      { id: "default", cd: 20, fd: 25, bd: 15, ref: 25, doc: 15 }
    );
  }
}

/* ========================= Domain Helpers ========================= */

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(normalizeEmail(email));
}

function isDueDiligenceEmail(email) {
  return normalizeEmail(email) === normalizeEmail(DUE_DILIGENCE_EMAIL);
}

async function isReviewerEmail(email) {
  const norm = normalizeEmail(email);
  try {
    const r = await execQuery(
      "SELECT TOP 1 Id FROM dbo.ReviewerAssignments WHERE ReviewerEmail=@Email",
      { Email: norm }
    );
    return r.recordset && r.recordset.length > 0;
  } catch {
    return false;
  }
}

function randomOtp6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s), "utf8").digest("hex");
}

function signSession(user) {
  const payload = {
    email: user.email,
    isAdmin: !!user.isAdmin,
    isDueDiligence: !!user.isDueDiligence,
    isReviewer: !!user.isReviewer,
    verified: !!user.verified,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function cookieOptions(req) {
  const isHttps =
    COOKIE_SECURE ||
    (req && (req.secure || req.headers["x-forwarded-proto"] === "https"));
  return {
    httpOnly: true,
    secure: !!isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function computeCompletion(vendor) {
  try {
    let total = 0;
    let filled = 0;

    const cd = (vendor && vendor.companyDetails) || {};
    const addr = (cd && cd.registeredAddress) || {};

    const companyRequiredFields = [
      "companyName",
      "managingDirectorName",
      "cinNumber",
      "yearOfEstablishment",
      "gstNumber",
      "companyOrigin",
      "panNumber",
    ];

    companyRequiredFields.forEach((field) => {
      total++;
      if (String(cd[field] || "").trim()) filled++;
    });

    const addressFields = ["line1", "pinCode", "district", "state"];
    addressFields.forEach((field) => {
      total++;
      if (String(addr[field] || "").trim()) filled++;
    });

    const fd = (vendor && vendor.financialDetails) || {};
    const turnover = (fd && fd.annualTurnover) || {};
    total += 4;
    if (Number(turnover.fy2022_23 || 0) > 0) filled++;
    if (Number(turnover.fy2023_24 || 0) > 0) filled++;
    if (Number(turnover.fy2024_25 || 0) > 0) filled++;
    if (Number(turnover.fy2025_26 || 0) > 0) filled++;

    const bd = (vendor && vendor.bankDetails) || {};
    const bankFields = ["bankName", "branch", "accountNumber", "ifscCode"];
    bankFields.forEach((field) => {
      total++;
      if (String(bd[field] || "").trim()) filled++;
    });

    const refs = Array.isArray(vendor.vendorReferences)
      ? vendor.vendorReferences
      : [];
    const validRefs = refs.filter(
      (r) => String(r.companyName || "").trim() && String(r.poDate || "").trim()
    ).length;
    total += 3;
    filled += Math.min(validRefs, 3);

    const contacts = Array.isArray(vendor.contactPersons)
      ? vendor.contactPersons
      : [];
    const validContacts = contacts.filter(
      (c) => String(c.name || "").trim() && String(c.mailId || "").trim()
    ).length;
    total += 1;
    filled += Math.min(validContacts, 1);

    const docs = Array.isArray(vendor.documents) ? vendor.documents : [];
    const attachedDocs = docs.filter(
      (d) => Array.isArray(d.files) && d.files.length > 0
    ).length;
    total += 5;
    filled += Math.min(attachedDocs, 5);

    if (total <= 0) return 0;
    return Math.round((filled / total) * 100);
  } catch {
    return 0;
  }
}

function createEmptyVendorForm(email) {
  const now = new Date().toISOString();
  const vendorId = crypto.randomUUID();

  const empty = {
    id: vendorId,
    email: email,
    companyDetails: {
      companyName: "",
      managingDirectorName: "",
      typeOfOrganisation: "",
      cinNumber: "",
      yearOfEstablishment: "",
      gstNumber: "",
      companyOrigin: "",
      panNumber: "",
      registeredAddress: {
        line1: "",
        line2: "",
        pinCode: "",
        district: "",
        state: "",
      },
      isMSME: false,
      msmeCertificate: undefined,
      goodsAndServices: [{ category: "" }, { category: "" }, { category: "" }],
      companyWebsite: "",
    },
    financialDetails: {
      annualTurnover: {
        fy2022_23: 0,
        fy2023_24: 0,
        fy2024_25: 0,
        fy2025_26: 0,
        attachments: [],
      },
      employmentDetails: {
        fy2022_23: { direct: 0, indirect: 0, total: 0 },
        fy2023_24: { direct: 0, indirect: 0, total: 0 },
        fy2024_25: { direct: 0, indirect: 0, total: 0 },
        fy2025_26: { direct: 0, indirect: 0, total: 0 },
      },
    },
    bankDetails: {
      bankName: "",
      branch: "",
      accountNumber: "",
      ifscCode: "",
      swiftCode: "",
    },
    vendorReferences: Array(5)
      .fill(null)
      .map(() => ({
        companyName: "",
        poDate: "",
        currentStatus: "",
        contactPersonName: "",
        contactNumber: "",
        mailId: "",
        completionDate: "",
        poValue: 0,
        remarks: "",
      })),
    contactPersons: Array(5)
      .fill(null)
      .map(() => ({
        name: "",
        designation: "",
        baseLocation: "",
        contactNumber: "",
        mailId: "",
        isPrimary: false,
      })),
    documents: DEFAULT_DOCUMENTS.map((name) => ({
      docName: name,
      attached: false,
      files: [],
      remarks: "",
    })),
    createdAt: now,
    updatedAt: now,
    completionPercentage: 0,
  };

  empty.completionPercentage = computeCompletion(empty);
  return empty;
}

/* ========================= Auth Middleware ========================= */

function authOptional(req, _res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) {
    req.auth = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.auth = decoded;
  } catch {
    req.auth = null;
  }
  return next();
}

function requireAuth(req, res, next) {
  if (!req.auth || !req.auth.email || !req.auth.verified) {
    return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.auth || !req.auth.isAdmin) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN_ADMIN" });
  }
  return next();
}

function requireDueDiligence(req, res, next) {
  if (!req.auth || !req.auth.isDueDiligence) {
    return res
      .status(403)
      .json({ ok: false, error: "FORBIDDEN_DUE_DILIGENCE" });
  }
  return next();
}

function requireReviewer(req, res, next) {
  if (!req.auth || !req.auth.isReviewer) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN_REVIEWER" });
  }
  return next();
}

/** Admin OR Reviewer */
function requireAdminOrReviewer(req, res, next) {
  if (!req.auth || (!req.auth.isAdmin && !req.auth.isReviewer)) {
    return res
      .status(403)
      .json({ ok: false, error: "FORBIDDEN_ADMIN_OR_REVIEWER" });
  }
  return next();
}

/* ========================= Express App ========================= */

const app = express();

app.set("trust proxy", true);

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(compression());
app.use(morgan("combined"));
app.use(cookieParser());

app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));

const allowedOrigins = String(process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, cb) {
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS_NOT_ALLOWED"), false);
    },
    credentials: true,
  })
);

app.use(authOptional);

/* ========================= API Routes ========================= */

app.get("/api/health", async (_req, res) => {
  try {
    await execQuery("SELECT 1 AS ok");
    return res.json({ ok: true, db: "up" });
  } catch (e) {
    return res.status(500).json({ ok: false, db: "down", error: String(e) });
  }
});

/* ---------- Auth ---------- */

app.get("/api/auth/me", async (req, res) => {
  if (!req.auth) return res.json({ ok: true, user: null });

  // Dynamically check reviewer status (could have changed since JWT issued)
  let isReviewer = !!req.auth.isReviewer;
  try {
    isReviewer = await isReviewerEmail(req.auth.email);
  } catch {
    // keep JWT value
  }

  const user = {
    ...req.auth,
    isReviewer,
  };

  // Re-issue token if reviewer status changed
  if (isReviewer !== !!req.auth.isReviewer) {
    const newToken = signSession(user);
    res.cookie(COOKIE_NAME, newToken, cookieOptions(req));
  }

  return res.json({ ok: true, user });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  return res.json({ ok: true });
});

app.post("/api/auth/request-otp", async (req, res) => {
  try {
    const email = normalizeEmail(req.body && req.body.email);
    if (!email || !email.includes("@")) {
      return res.status(400).json({ ok: false, error: "INVALID_EMAIL" });
    }

    const otp = randomOtp6();
    const otpHash = sha256Hex(otp);
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    const isAdmin = isAdminEmail(email);
    const isDueDiligence = isDueDiligenceEmail(email);

    await execQuery(
      `
MERGE dbo.Users AS t
USING (SELECT @Email AS Email) AS s
ON (t.Email = s.Email)
WHEN MATCHED THEN
  UPDATE SET
    IsAdmin = @IsAdmin,
    IsDueDiligence = @IsDueDiligence,
    OtpHash = @OtpHash,
    OtpExpiry = @OtpExpiry,
    Verified = 0,
    UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
  INSERT (Email, IsAdmin, IsDueDiligence, OtpHash, OtpExpiry, Verified)
  VALUES (@Email, @IsAdmin, @IsDueDiligence, @OtpHash, @OtpExpiry, 0);
      `,
      {
        Email: email,
        IsAdmin: isAdmin ? 1 : 0,
        IsDueDiligence: isDueDiligence ? 1 : 0,
        OtpHash: otpHash,
        OtpExpiry: expiry,
      }
    );

    try {
      await sendOtpEmail(email, otp, 10);
    } catch (mailErr) {
      return res.status(500).json({
        ok: false,
        error: "OTP_EMAIL_SEND_FAILED",
        details: String(mailErr && (mailErr.message || mailErr)),
      });
    }

    return res.json({
      ok: true,
      message: "OTP sent. Please check your email.",
      expiresInSeconds: 600,
    });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, error: "REQUEST_OTP_FAILED", details: String(e) });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const email = normalizeEmail(req.body && req.body.email);
    const otp = String(req.body && req.body.otp ? req.body.otp : "").trim();

    if (!email || !email.includes("@")) {
      return res.status(400).json({ ok: false, error: "INVALID_EMAIL" });
    }
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ ok: false, error: "INVALID_OTP_FORMAT" });
    }

    const r = await execQuery(
      "SELECT TOP 1 * FROM dbo.Users WHERE Email=@Email",
      { Email: email }
    );
    const u = r.recordset && r.recordset[0];
    if (!u || !u.OtpHash || !u.OtpExpiry) {
      return res.status(400).json({ ok: false, error: "OTP_NOT_REQUESTED" });
    }

    const now = new Date();
    const expiry = new Date(u.OtpExpiry);
    if (expiry <= now) {
      return res.status(400).json({ ok: false, error: "OTP_EXPIRED" });
    }

    const incomingHash = sha256Hex(otp);
    if (incomingHash !== String(u.OtpHash)) {
      return res.status(400).json({ ok: false, error: "OTP_INVALID" });
    }

    await execQuery(
      `UPDATE dbo.Users
SET Verified=1, OtpHash=NULL, OtpExpiry=NULL, UpdatedAt=SYSUTCDATETIME()
WHERE Email=@Email`,
      { Email: email }
    );

    // Check reviewer status dynamically
    const isReviewer = await isReviewerEmail(email);

    const sessionUser = {
      email: email,
      isAdmin: !!u.IsAdmin,
      isDueDiligence: !!u.IsDueDiligence,
      isReviewer: isReviewer,
      verified: true,
    };

    const token = signSession(sessionUser);
    res.cookie(COOKIE_NAME, token, cookieOptions(req));

    return res.json({ ok: true, user: sessionUser });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, error: "VERIFY_OTP_FAILED", details: String(e) });
  }
});

/* ---------- Vendor (logged-in vendors) ---------- */

app.get("/api/vendor/me", requireAuth, async (req, res) => {
  try {
    const email = normalizeEmail(req.auth.email);

    const existing = await execQuery(
      "SELECT TOP 1 VendorId, VendorJson FROM dbo.Vendors WHERE Email=@Email ORDER BY UpdatedAt DESC",
      { Email: email }
    );

    if (existing.recordset && existing.recordset.length > 0) {
      const row = existing.recordset[0];
      const data = JSON.parse(row.VendorJson);
      return res.json({ ok: true, vendor: data });
    }

    const empty = createEmptyVendorForm(email);
    const vendorId = empty.id;

    await execQuery(
      `INSERT INTO dbo.Vendors (VendorId, Email, CompanyName, CompletionPercentage, Submitted, VendorJson, CreatedAt, UpdatedAt)
VALUES (@VendorId, @Email, @CompanyName, @CompletionPercentage, 0, @VendorJson, SYSUTCDATETIME(), SYSUTCDATETIME())`,
      {
        VendorId: vendorId,
        Email: email,
        CompanyName: String(empty.companyDetails.companyName || ""),
        CompletionPercentage: Number(empty.completionPercentage || 0),
        VendorJson: JSON.stringify(empty),
      }
    );

    return res.json({ ok: true, vendor: empty });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, error: "VENDOR_ME_FAILED", details: String(e) });
  }
});

app.post("/api/vendor/save", requireAuth, async (req, res) => {
  try {
    const email = normalizeEmail(req.auth.email);
    const vendor = req.body && req.body.vendor ? req.body.vendor : req.body;
    if (!vendor)
      return res.status(400).json({ ok: false, error: "MISSING_VENDOR_BODY" });

    if (!req.auth.isAdmin) {
      if (normalizeEmail(vendor.email) !== email) {
        return res
          .status(403)
          .json({ ok: false, error: "CANNOT_SAVE_OTHER_VENDOR" });
      }
    }

    const vendorId = String(vendor.id || vendor.vendorId || "");
    if (!vendorId || !isGuid(vendorId))
      return res.status(400).json({ ok: false, error: "INVALID_VENDOR_ID" });

    vendor.email = normalizeEmail(vendor.email || email);
    vendor.updatedAt = new Date().toISOString();
    vendor.completionPercentage = computeCompletion(vendor);

    const companyName = String(
      (vendor.companyDetails && vendor.companyDetails.companyName) || ""
    );
    const submitted = !!vendor.submitted || false;

    await execQuery(
      `
MERGE dbo.Vendors AS t
USING (SELECT @VendorId AS VendorId) AS s
ON (t.VendorId = TRY_CONVERT(uniqueidentifier, s.VendorId))
WHEN MATCHED THEN
  UPDATE SET
    Email=@Email, CompanyName=@CompanyName, CompletionPercentage=@CompletionPercentage,
    Submitted=@Submitted, VendorJson=@VendorJson, UpdatedAt=SYSUTCDATETIME()
WHEN NOT MATCHED THEN
  INSERT (VendorId, Email, CompanyName, CompletionPercentage, Submitted, VendorJson, CreatedAt, UpdatedAt)
  VALUES (TRY_CONVERT(uniqueidentifier, @VendorId), @Email, @CompanyName, @CompletionPercentage, @Submitted, @VendorJson, SYSUTCDATETIME(), SYSUTCDATETIME());
      `,
      {
        VendorId: vendorId,
        Email: vendor.email,
        CompanyName: companyName,
        CompletionPercentage: Number(vendor.completionPercentage || 0),
        Submitted: submitted ? 1 : 0,
        VendorJson: JSON.stringify(vendor),
      }
    );

    return res.json({ ok: true, vendor });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, error: "VENDOR_SAVE_FAILED", details: String(e) });
  }
});

app.post("/api/vendor/submit", requireAuth, async (req, res) => {
  try {
    const email = normalizeEmail(req.auth.email);
    const vendor = req.body && req.body.vendor ? req.body.vendor : req.body;
    if (!vendor)
      return res.status(400).json({ ok: false, error: "MISSING_VENDOR_BODY" });

    if (!req.auth.isAdmin) {
      if (normalizeEmail(vendor.email) !== email)
        return res
          .status(403)
          .json({ ok: false, error: "CANNOT_SUBMIT_OTHER_VENDOR" });
    }

    const vendorId = String(vendor.id || vendor.vendorId || "");
    if (!vendorId || !isGuid(vendorId))
      return res.status(400).json({ ok: false, error: "INVALID_VENDOR_ID" });

    vendor.email = normalizeEmail(vendor.email || email);
    vendor.updatedAt = new Date().toISOString();
    vendor.completionPercentage = 100;
    vendor.submitted = true;
    vendor.submittedAt = new Date().toISOString();

    const companyName = String(
      (vendor.companyDetails && vendor.companyDetails.companyName) || ""
    );

    await execQuery(
      `UPDATE dbo.Vendors SET
  Email=@Email, CompanyName=@CompanyName, CompletionPercentage=100,
  Submitted=1, SubmittedAt=SYSUTCDATETIME(), VendorJson=@VendorJson, UpdatedAt=SYSUTCDATETIME()
WHERE VendorId=TRY_CONVERT(uniqueidentifier, @VendorId);`,
      {
        VendorId: vendorId,
        Email: vendor.email,
        CompanyName: companyName,
        VendorJson: JSON.stringify(vendor),
      }
    );

    return res.json({ ok: true, vendor });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, error: "VENDOR_SUBMIT_FAILED", details: String(e) });
  }
});

/* ---------- Scoring Matrix (legacy – kept for backward compat) ---------- */

app.get("/api/scoring-matrix", requireAuth, async (_req, res) => {
  try {
    const r = await execQuery(
      "SELECT TOP 1 * FROM dbo.ScoringMatrix WHERE MatrixId=@id",
      { id: "default" }
    );
    const m = r.recordset && r.recordset[0];
    if (!m)
      return res.status(404).json({ ok: false, error: "MATRIX_NOT_FOUND" });
    return res.json({
      ok: true,
      matrix: {
        id: "default",
        companyDetailsWeight: Number(m.CompanyDetailsWeight),
        financialDetailsWeight: Number(m.FinancialDetailsWeight),
        bankDetailsWeight: Number(m.BankDetailsWeight),
        referencesWeight: Number(m.ReferencesWeight),
        documentsWeight: Number(m.DocumentsWeight),
      },
    });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, error: "GET_MATRIX_FAILED", details: String(e) });
  }
});

app.put("/api/scoring-matrix", requireAuth, requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const matrix = body.matrix || body;
    const cd = Number(matrix.companyDetailsWeight);
    const fd = Number(matrix.financialDetailsWeight);
    const bd = Number(matrix.bankDetailsWeight);
    const ref = Number(matrix.referencesWeight);
    const doc = Number(matrix.documentsWeight);
    const values = [cd, fd, bd, ref, doc];
    if (values.some((v) => !Number.isFinite(v) || v < 0 || v > 100))
      return res.status(400).json({ ok: false, error: "INVALID_WEIGHTS" });

    await execQuery(
      `MERGE dbo.ScoringMatrix AS t
USING (SELECT @id AS MatrixId) AS s ON (t.MatrixId = s.MatrixId)
WHEN MATCHED THEN UPDATE SET CompanyDetailsWeight=@cd,FinancialDetailsWeight=@fd,BankDetailsWeight=@bd,ReferencesWeight=@ref,DocumentsWeight=@doc,UpdatedAt=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (MatrixId,CompanyDetailsWeight,FinancialDetailsWeight,BankDetailsWeight,ReferencesWeight,DocumentsWeight) VALUES (@id,@cd,@fd,@bd,@ref,@doc);`,
      { id: "default", cd, fd, bd, ref, doc }
    );

    return res.json({
      ok: true,
      matrix: {
        id: "default",
        companyDetailsWeight: cd,
        financialDetailsWeight: fd,
        bankDetailsWeight: bd,
        referencesWeight: ref,
        documentsWeight: doc,
      },
    });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, error: "SAVE_MATRIX_FAILED", details: String(e) });
  }
});

/* ---------- Admin: Vendors list/details ---------- */

app.get("/api/admin/vendors", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const r = await execQuery(
      `SELECT VendorId, Email, CompanyName, CompletionPercentage, Submitted, SubmittedAt, CreatedAt, UpdatedAt
FROM dbo.Vendors ORDER BY UpdatedAt DESC`
    );

    const vendors = (r.recordset || []).map((row) => ({
      id: String(row.VendorId),
      email: String(row.Email),
      companyName: row.CompanyName ? String(row.CompanyName) : "",
      completionPercentage: Number(row.CompletionPercentage || 0),
      submitted: !!row.Submitted,
      submittedAt: row.SubmittedAt
        ? new Date(row.SubmittedAt).toISOString()
        : null,
      createdAt: row.CreatedAt ? new Date(row.CreatedAt).toISOString() : null,
      updatedAt: row.UpdatedAt ? new Date(row.UpdatedAt).toISOString() : null,
    }));

    return res.json({ ok: true, vendors });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "ADMIN_LIST_VENDORS_FAILED",
      details: String(e),
    });
  }
});

app.get(
  "/api/admin/vendors/:id",
  requireAuth,
  requireAdminOrReviewer,
  async (req, res) => {
    try {
      const id = String(req.params.id || "");
      if (!isGuid(id))
        return res.status(400).json({ ok: false, error: "INVALID_VENDOR_ID" });

      const r = await execQuery(
        "SELECT TOP 1 VendorJson FROM dbo.Vendors WHERE VendorId=TRY_CONVERT(uniqueidentifier, @id)",
        { id }
      );
      const row = r.recordset && r.recordset[0];
      if (!row)
        return res.status(404).json({ ok: false, error: "VENDOR_NOT_FOUND" });

      const vendor = JSON.parse(row.VendorJson);

      // If reviewer (not admin), verify they are assigned to this vendor, then return full data
      if (!req.auth.isAdmin && req.auth.isReviewer) {
        const email = normalizeEmail(req.auth.email);
        const assignments = await execQuery(
          "SELECT SectionType FROM dbo.ReviewerAssignments WHERE VendorId=TRY_CONVERT(uniqueidentifier, @id) AND ReviewerEmail=@Email",
          { id, Email: email }
        );
        const sections = (assignments.recordset || []).map((r) =>
          String(r.SectionType)
        );

        if (sections.length === 0) {
          return res
            .status(403)
            .json({ ok: false, error: "NOT_ASSIGNED_TO_VENDOR" });
        }

        // Return full vendor data (read-only) along with their assigned sections
        return res.json({ ok: true, vendor, reviewerSections: sections });
      }

      return res.json({ ok: true, vendor });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: "ADMIN_GET_VENDOR_FAILED",
        details: String(e),
      });
    }
  }
);

/* ---------- Admin: Classification (legacy - kept) ---------- */

function computeTotalScoreLegacy(scores, matrix) {
  const cd =
    Number(scores.companyDetails || 0) *
    (Number(matrix.companyDetailsWeight || 0) / 100);
  const fd =
    Number(scores.financialDetails || 0) *
    (Number(matrix.financialDetailsWeight || 0) / 100);
  const bd =
    Number(scores.bankDetails || 0) *
    (Number(matrix.bankDetailsWeight || 0) / 100);
  const ref =
    Number(scores.references || 0) *
    (Number(matrix.referencesWeight || 0) / 100);
  const doc =
    Number(scores.documents || 0) * (Number(matrix.documentsWeight || 0) / 100);
  return Math.round(cd + fd + bd + ref + doc);
}

app.get(
  "/api/admin/classifications",
  requireAuth,
  requireAdmin,
  async (_req, res) => {
    try {
      const r = await execQuery(
        `SELECT VendorId, VendorType, OpexSubType, CapexSubType, CapexBand,
CompanyDetailsScore, FinancialDetailsScore, BankDetailsScore, ReferencesScore, DocumentsScore,
TotalScore, Notes, DueDiligenceSent, DueDiligenceDate, InfoRequestSent, InfoRequestDate, UpdatedAt
FROM dbo.VendorClassifications ORDER BY TotalScore DESC, UpdatedAt DESC`
      );

      const classifications = (r.recordset || []).map((c) => ({
        vendorId: String(c.VendorId),
        vendorType: c.VendorType ? String(c.VendorType) : null,
        opexSubType: c.OpexSubType ? String(c.OpexSubType) : null,
        capexSubType: c.CapexSubType ? String(c.CapexSubType) : null,
        capexBand: c.CapexBand ? String(c.CapexBand) : null,
        scores: {
          companyDetails: Number(c.CompanyDetailsScore || 0),
          financialDetails: Number(c.FinancialDetailsScore || 0),
          bankDetails: Number(c.BankDetailsScore || 0),
          references: Number(c.ReferencesScore || 0),
          documents: Number(c.DocumentsScore || 0),
        },
        totalScore: Number(c.TotalScore || 0),
        notes: c.Notes ? String(c.Notes) : "",
        dueDiligenceSent: !!c.DueDiligenceSent,
        dueDiligenceDate: c.DueDiligenceDate
          ? new Date(c.DueDiligenceDate).toISOString()
          : null,
        infoRequestSent: !!c.InfoRequestSent,
        infoRequestDate: c.InfoRequestDate
          ? new Date(c.InfoRequestDate).toISOString()
          : null,
        updatedAt: c.UpdatedAt ? new Date(c.UpdatedAt).toISOString() : null,
      }));

      return res.json({ ok: true, classifications });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: "LIST_CLASSIFICATIONS_FAILED",
        details: String(e),
      });
    }
  }
);

app.get(
  "/api/admin/classifications/:vendorId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const vendorId = String(req.params.vendorId || "");
      if (!isGuid(vendorId))
        return res.status(400).json({ ok: false, error: "INVALID_VENDOR_ID" });

      const r = await execQuery(
        "SELECT TOP 1 * FROM dbo.VendorClassifications WHERE VendorId=TRY_CONVERT(uniqueidentifier, @vendorId)",
        { vendorId }
      );
      const c = r.recordset && r.recordset[0];
      if (!c) return res.json({ ok: true, classification: null });

      return res.json({
        ok: true,
        classification: {
          vendorId: String(c.VendorId),
          vendorType: c.VendorType ? String(c.VendorType) : null,
          opexSubType: c.OpexSubType ? String(c.OpexSubType) : null,
          capexSubType: c.CapexSubType ? String(c.CapexSubType) : null,
          capexBand: c.CapexBand ? String(c.CapexBand) : null,
          scores: {
            companyDetails: Number(c.CompanyDetailsScore || 0),
            financialDetails: Number(c.FinancialDetailsScore || 0),
            bankDetails: Number(c.BankDetailsScore || 0),
            references: Number(c.ReferencesScore || 0),
            documents: Number(c.DocumentsScore || 0),
          },
          totalScore: Number(c.TotalScore || 0),
          notes: c.Notes ? String(c.Notes) : "",
          dueDiligenceSent: !!c.DueDiligenceSent,
          dueDiligenceDate: c.DueDiligenceDate
            ? new Date(c.DueDiligenceDate).toISOString()
            : null,
          infoRequestSent: !!c.InfoRequestSent,
          infoRequestDate: c.InfoRequestDate
            ? new Date(c.InfoRequestDate).toISOString()
            : null,
        },
      });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: "GET_CLASSIFICATION_FAILED",
        details: String(e),
      });
    }
  }
);

app.put(
  "/api/admin/classifications/:vendorId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const vendorId = String(req.params.vendorId || "");
      if (!isGuid(vendorId))
        return res.status(400).json({ ok: false, error: "INVALID_VENDOR_ID" });

      const body = req.body || {};
      const classification = body.classification || body;

      const vendorType = classification.vendorType || null;
      const opexSubType = classification.opexSubType || null;
      const capexSubType = classification.capexSubType || null;
      const capexBand = classification.capexBand || null;
      const notes = classification.notes ? String(classification.notes) : "";

      await execQuery(
        `MERGE dbo.VendorClassifications AS t
USING (SELECT @VendorId AS VendorId) AS s
ON (t.VendorId = TRY_CONVERT(uniqueidentifier, s.VendorId))
WHEN MATCHED THEN UPDATE SET VendorType=@VendorType,OpexSubType=@OpexSubType,CapexSubType=@CapexSubType,CapexBand=@CapexBand,Notes=@Notes,UpdatedAt=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (VendorId,VendorType,OpexSubType,CapexSubType,CapexBand,Notes) VALUES (TRY_CONVERT(uniqueidentifier,@VendorId),@VendorType,@OpexSubType,@CapexSubType,@CapexBand,@Notes);`,
        {
          VendorId: vendorId,
          VendorType: vendorType,
          OpexSubType: opexSubType,
          CapexSubType: capexSubType,
          CapexBand: capexBand,
          Notes: notes,
        }
      );

      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: "SAVE_CLASSIFICATION_FAILED",
        details: String(e),
      });
    }
  }
);

/* ========================= NEW GRADING ENDPOINTS ========================= */

/* ---------- Reviewer Assignment (Admin) ---------- */

app.post(
  "/api/admin/reviewers/assign",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { vendorId, sectionType, reviewerEmail } = req.body || {};

      if (!vendorId || !isGuid(vendorId))
        return res.status(400).json({ ok: false, error: "INVALID_VENDOR_ID" });
      if (!GRADING_SECTIONS.includes(sectionType))
        return res
          .status(400)
          .json({ ok: false, error: "INVALID_SECTION_TYPE" });
      const normEmail = normalizeEmail(reviewerEmail);
      if (!normEmail || !normEmail.includes("@"))
        return res
          .status(400)
          .json({ ok: false, error: "INVALID_REVIEWER_EMAIL" });

      // Ensure vendor exists
      const v = await execQuery(
        "SELECT TOP 1 VendorId, CompanyName FROM dbo.Vendors WHERE VendorId=TRY_CONVERT(uniqueidentifier, @vendorId)",
        { vendorId }
      );
      if (!v.recordset || v.recordset.length === 0)
        return res.status(404).json({ ok: false, error: "VENDOR_NOT_FOUND" });

      const vendorName = v.recordset[0].CompanyName || "Unnamed Vendor";

      // Ensure user record exists for reviewer
      await execQuery(
        `MERGE dbo.Users AS t USING (SELECT @Email AS Email) AS s ON (t.Email = s.Email)
WHEN NOT MATCHED THEN INSERT (Email, IsAdmin, IsDueDiligence, Verified) VALUES (@Email, 0, 0, 0);`,
        { Email: normEmail }
      );

      // Insert assignment (ignore duplicate)
      try {
        await execQuery(
          `INSERT INTO dbo.ReviewerAssignments (VendorId, SectionType, ReviewerEmail, AssignedBy)
VALUES (TRY_CONVERT(uniqueidentifier, @VendorId), @SectionType, @ReviewerEmail, @AssignedBy)`,
          {
            VendorId: vendorId,
            SectionType: sectionType,
            ReviewerEmail: normEmail,
            AssignedBy: normalizeEmail(req.auth.email),
          }
        );
      } catch (dupErr) {
        if (String(dupErr).includes("UQ_ReviewerAssignment")) {
          return res.json({ ok: true, message: "Already assigned" });
        }
        throw dupErr;
      }

      // Send notification email (best effort)
      sendReviewerAssignmentEmail(normEmail, vendorName, sectionType).catch(
        () => {}
      );

      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: "ASSIGN_REVIEWER_FAILED",
        details: String(e),
      });
    }
  }
);

app.delete(
  "/api/admin/reviewers/:assignmentId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.assignmentId);
      if (!id || !Number.isFinite(id))
        return res
          .status(400)
          .json({ ok: false, error: "INVALID_ASSIGNMENT_ID" });

      await execQuery("DELETE FROM dbo.ReviewerAssignments WHERE Id=@Id", {
        Id: id,
      });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: "DELETE_ASSIGNMENT_FAILED",
        details: String(e),
      });
    }
  }
);

app.get(
  "/api/admin/reviewers/:vendorId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const vendorId = String(req.params.vendorId || "");
      if (!isGuid(vendorId))
        return res.status(400).json({ ok: false, error: "INVALID_VENDOR_ID" });

      const r = await execQuery(
        `SELECT Id, VendorId, SectionType, ReviewerEmail, AssignedBy, AssignedAt
FROM dbo.ReviewerAssignments WHERE VendorId=TRY_CONVERT(uniqueidentifier, @vendorId)
ORDER BY SectionType, AssignedAt`,
        { vendorId }
      );

      const assignments = (r.recordset || []).map((row) => ({
        id: row.Id,
        vendorId: String(row.VendorId),
        sectionType: String(row.SectionType),
        reviewerEmail: String(row.ReviewerEmail),
        assignedBy: String(row.AssignedBy),
        assignedAt: new Date(row.AssignedAt).toISOString(),
      }));

      return res.json({ ok: true, assignments });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: "GET_ASSIGNMENTS_FAILED",
        details: String(e),
      });
    }
  }
);

/* ---------- Reviewer: My assignments ---------- */

app.get(
  "/api/reviewer/assignments",
  requireAuth,
  requireReviewer,
  async (req, res) => {
    try {
      const email = normalizeEmail(req.auth.email);

      const r = await execQuery(
        `SELECT ra.Id, ra.VendorId, ra.SectionType, ra.AssignedAt,
  v.CompanyName, v.Email AS VendorEmail, v.CompletionPercentage, v.Submitted
FROM dbo.ReviewerAssignments ra
LEFT JOIN dbo.Vendors v ON v.VendorId = ra.VendorId
WHERE ra.ReviewerEmail = @Email
ORDER BY ra.AssignedAt DESC`,
        { Email: email }
      );

      // Also check which ones have ratings submitted
      const ratingsR = await execQuery(
        `SELECT DISTINCT VendorId, SectionType FROM dbo.VendorRatings WHERE RatedBy=@Email`,
        { Email: email }
      );
      const submittedSet = new Set(
        (ratingsR.recordset || []).map(
          (r) => `${String(r.VendorId)}_${r.SectionType}`
        )
      );

      const assignments = (r.recordset || []).map((row) => ({
        id: row.Id,
        vendorId: String(row.VendorId),
        sectionType: String(row.SectionType),
        assignedAt: new Date(row.AssignedAt).toISOString(),
        vendor: {
          companyName: row.CompanyName ? String(row.CompanyName) : "",
          email: row.VendorEmail ? String(row.VendorEmail) : "",
          completionPercentage: Number(row.CompletionPercentage || 0),
          submitted: !!row.Submitted,
        },
        ratingsSubmitted: submittedSet.has(
          `${String(row.VendorId)}_${row.SectionType}`
        ),
      }));

      return res.json({ ok: true, assignments });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: "REVIEWER_ASSIGNMENTS_FAILED",
        details: String(e),
      });
    }
  }
);

/* ---------- Reviewer: Get existing ratings ---------- */

app.get(
  "/api/reviewer/ratings/:vendorId/:sectionType",
  requireAuth,
  requireReviewer,
  async (req, res) => {
    try {
      const vendorId = String(req.params.vendorId || "");
      const sectionType = String(req.params.sectionType || "");
      const email = normalizeEmail(req.auth.email);

      if (!isGuid(vendorId))
        return res.status(400).json({ ok: false, error: "INVALID_VENDOR_ID" });
      if (!GRADING_SECTIONS.includes(sectionType))
        return res
          .status(400)
          .json({ ok: false, error: "INVALID_SECTION_TYPE" });

      // Verify assignment
      const assign = await execQuery(
        `SELECT TOP 1 Id FROM dbo.ReviewerAssignments
WHERE VendorId=TRY_CONVERT(uniqueidentifier, @vendorId) AND SectionType=@SectionType AND ReviewerEmail=@Email`,
        { vendorId, SectionType: sectionType, Email: email }
      );
      if (!assign.recordset || assign.recordset.length === 0)
        return res.status(403).json({ ok: false, error: "NOT_ASSIGNED" });

      const r = await execQuery(
        `SELECT ParameterKey, Rating, RatedAt FROM dbo.VendorRatings
WHERE VendorId=TRY_CONVERT(uniqueidentifier, @vendorId) AND SectionType=@SectionType AND RatedBy=@Email`,
        { vendorId, SectionType: sectionType, Email: email }
      );

      const ratings = {};
      (r.recordset || []).forEach((row) => {
        ratings[row.ParameterKey] = Number(row.Rating);
      });

      return res.json({ ok: true, ratings });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: "GET_RATINGS_FAILED",
        details: String(e),
      });
    }
  }
);

/* ---------- Reviewer: Submit ratings ---------- */

app.post(
  "/api/reviewer/rate",
  requireAuth,
  requireReviewer,
  async (req, res) => {
    try {
      const { vendorId, sectionType, ratings } = req.body || {};
      const email = normalizeEmail(req.auth.email);

      if (!vendorId || !isGuid(vendorId))
        return res.status(400).json({ ok: false, error: "INVALID_VENDOR_ID" });
      if (!GRADING_SECTIONS.includes(sectionType))
        return res
          .status(400)
          .json({ ok: false, error: "INVALID_SECTION_TYPE" });
      if (!ratings || typeof ratings !== "object")
        return res.status(400).json({ ok: false, error: "MISSING_RATINGS" });

      // Verify assignment
      const assign = await execQuery(
        `SELECT TOP 1 Id FROM dbo.ReviewerAssignments
WHERE VendorId=TRY_CONVERT(uniqueidentifier, @vendorId) AND SectionType=@SectionType AND ReviewerEmail=@Email`,
        { vendorId, SectionType: sectionType, Email: email }
      );
      if (!assign.recordset || assign.recordset.length === 0)
        return res.status(403).json({ ok: false, error: "NOT_ASSIGNED" });

      // Validate all parameter keys and ratings
      const validParams = getParamsForSection(sectionType);
      const validKeys = new Set(validParams.map((p) => p.key));

      for (const [key, val] of Object.entries(ratings)) {
        if (!validKeys.has(key))
          return res.status(400).json({
            ok: false,
            error: "INVALID_PARAMETER_KEY",
            details: key,
          });
        const rating = Number(val);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5)
          return res.status(400).json({
            ok: false,
            error: "INVALID_RATING_VALUE",
            details: `${key}: ${val}`,
          });
      }

      // Upsert each rating
      for (const [key, val] of Object.entries(ratings)) {
        await execQuery(
          `MERGE dbo.VendorRatings AS t
USING (SELECT @VendorId AS VendorId, @SectionType AS SectionType, @ParameterKey AS ParameterKey, @RatedBy AS RatedBy) AS s
ON (t.VendorId=TRY_CONVERT(uniqueidentifier,s.VendorId) AND t.SectionType=s.SectionType AND t.ParameterKey=s.ParameterKey AND t.RatedBy=s.RatedBy)
WHEN MATCHED THEN UPDATE SET Rating=@Rating, RatedAt=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (VendorId,SectionType,ParameterKey,Rating,RatedBy) VALUES (TRY_CONVERT(uniqueidentifier,@VendorId),@SectionType,@ParameterKey,@Rating,@RatedBy);`,
          {
            VendorId: vendorId,
            SectionType: sectionType,
            ParameterKey: key,
            Rating: Number(val),
            RatedBy: email,
          }
        );
      }

      // Auto-compute grade if all 3 sections have ratings
      await autoComputeGrade(vendorId);

      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: "SUBMIT_RATINGS_FAILED",
        details: String(e),
      });
    }
  }
);

/* ---------- Grade computation helper ---------- */

async function autoComputeGrade(vendorId) {
  try {
    // Get all ratings for this vendor
    const r = await execQuery(
      `SELECT SectionType, ParameterKey, Rating FROM dbo.VendorRatings
WHERE VendorId=TRY_CONVERT(uniqueidentifier, @vendorId)`,
      { vendorId }
    );

    const bySection = { site: {}, procurement: {}, financial: {} };
    (r.recordset || []).forEach((row) => {
      const section = String(row.SectionType);
      if (bySection[section]) {
        bySection[section][row.ParameterKey] = Number(row.Rating);
      }
    });

    // Check if all sections have at least some ratings
    const siteComplete =
      Object.keys(bySection.site).length === SITE_PARAMS.length;
    const procComplete =
      Object.keys(bySection.procurement).length === PROCUREMENT_PARAMS.length;
    const finComplete =
      Object.keys(bySection.financial).length === FINANCIAL_PARAMS.length;

    const siteScore = computeSectionScore("site", bySection.site);
    const procScore = computeSectionScore("procurement", bySection.procurement);
    const finScore = computeSectionScore("financial", bySection.financial);
    const totalScore =
      Math.round((siteScore + procScore + finScore) * 100) / 100;

    const computedGrade = getGradeForScore(totalScore);

    // Get existing override if any
    const existingGrade = await execQuery(
      "SELECT TOP 1 AdminOverrideGrade FROM dbo.VendorGrades WHERE VendorId=TRY_CONVERT(uniqueidentifier, @vendorId)",
      { vendorId }
    );
    const override =
      existingGrade.recordset &&
      existingGrade.recordset[0] &&
      existingGrade.recordset[0].AdminOverrideGrade
        ? String(existingGrade.recordset[0].AdminOverrideGrade)
        : null;

    const finalGrade = override || computedGrade;

    await execQuery(
      `MERGE dbo.VendorGrades AS t
USING (SELECT @VendorId AS VendorId) AS s ON (t.VendorId=TRY_CONVERT(uniqueidentifier,s.VendorId))
WHEN MATCHED THEN UPDATE SET SiteScore=@SiteScore,ProcurementScore=@ProcScore,FinancialScore=@FinScore,
  TotalScore=@TotalScore,ComputedGrade=@ComputedGrade,FinalGrade=@FinalGrade,ComputedAt=SYSUTCDATETIME(),UpdatedAt=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (VendorId,SiteScore,ProcurementScore,FinancialScore,TotalScore,ComputedGrade,FinalGrade,ComputedAt)
  VALUES (TRY_CONVERT(uniqueidentifier,@VendorId),@SiteScore,@ProcScore,@FinScore,@TotalScore,@ComputedGrade,@FinalGrade,SYSUTCDATETIME());`,
      {
        VendorId: vendorId,
        SiteScore: siteScore,
        ProcScore: procScore,
        FinScore: finScore,
        TotalScore: totalScore,
        ComputedGrade: computedGrade,
        FinalGrade: finalGrade,
      }
    );

    return {
      siteScore,
      procurementScore: procScore,
      financialScore: finScore,
      totalScore,
      computedGrade,
      finalGrade,
    };
  } catch (e) {
    console.error("autoComputeGrade error:", e);
    return null;
  }
}

/* ---------- Admin: Grades ---------- */

app.get("/api/admin/grades", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const r = await execQuery(
      `SELECT g.VendorId, g.SiteScore, g.ProcurementScore, g.FinancialScore,
  g.TotalScore, g.ComputedGrade, g.AdminOverrideGrade, g.FinalGrade,
  g.ComputedAt, g.OverriddenBy, g.OverriddenAt,
  v.CompanyName, v.Email
FROM dbo.VendorGrades g
LEFT JOIN dbo.Vendors v ON v.VendorId = g.VendorId
ORDER BY g.TotalScore DESC`
    );

    const grades = (r.recordset || []).map((row) => ({
      vendorId: String(row.VendorId),
      siteScore: Number(row.SiteScore || 0),
      procurementScore: Number(row.ProcurementScore || 0),
      financialScore: Number(row.FinancialScore || 0),
      totalScore: Number(row.TotalScore || 0),
      computedGrade: row.ComputedGrade ? String(row.ComputedGrade) : null,
      adminOverrideGrade: row.AdminOverrideGrade
        ? String(row.AdminOverrideGrade)
        : null,
      finalGrade: row.FinalGrade ? String(row.FinalGrade) : null,
      computedAt: row.ComputedAt
        ? new Date(row.ComputedAt).toISOString()
        : null,
      overriddenBy: row.OverriddenBy ? String(row.OverriddenBy) : null,
      overriddenAt: row.OverriddenAt
        ? new Date(row.OverriddenAt).toISOString()
        : null,
      companyName: row.CompanyName ? String(row.CompanyName) : "",
      email: row.Email ? String(row.Email) : "",
    }));

    return res.json({ ok: true, grades });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "GET_ALL_GRADES_FAILED",
      details: String(e),
    });
  }
});

app.get(
  "/api/admin/grades/:vendorId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const vendorId = String(req.params.vendorId || "");
      if (!isGuid(vendorId))
        return res.status(400).json({ ok: false, error: "INVALID_VENDOR_ID" });

      const r = await execQuery(
        "SELECT TOP 1 * FROM dbo.VendorGrades WHERE VendorId=TRY_CONVERT(uniqueidentifier, @vendorId)",
        { vendorId }
      );
      const row = r.recordset && r.recordset[0];
      if (!row) return res.json({ ok: true, grade: null });

      return res.json({
        ok: true,
        grade: {
          vendorId: String(row.VendorId),
          siteScore: Number(row.SiteScore || 0),
          procurementScore: Number(row.ProcurementScore || 0),
          financialScore: Number(row.FinancialScore || 0),
          totalScore: Number(row.TotalScore || 0),
          computedGrade: row.ComputedGrade ? String(row.ComputedGrade) : null,
          adminOverrideGrade: row.AdminOverrideGrade
            ? String(row.AdminOverrideGrade)
            : null,
          finalGrade: row.FinalGrade ? String(row.FinalGrade) : null,
          computedAt: row.ComputedAt
            ? new Date(row.ComputedAt).toISOString()
            : null,
          overriddenBy: row.OverriddenBy ? String(row.OverriddenBy) : null,
          overriddenAt: row.OverriddenAt
            ? new Date(row.OverriddenAt).toISOString()
            : null,
        },
      });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: "GET_GRADE_FAILED",
        details: String(e),
      });
    }
  }
);

/** Admin manually trigger grade computation */
app.post(
  "/api/admin/grades/:vendorId/compute",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const vendorId = String(req.params.vendorId || "");
      if (!isGuid(vendorId))
        return res.status(400).json({ ok: false, error: "INVALID_VENDOR_ID" });

      const result = await autoComputeGrade(vendorId);
      if (!result)
        return res
          .status(500)
          .json({ ok: false, error: "COMPUTE_GRADE_FAILED" });

      return res.json({ ok: true, grade: result });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: "COMPUTE_GRADE_FAILED",
        details: String(e),
      });
    }
  }
);

/** Admin override grade */
app.put(
  "/api/admin/grades/:vendorId/override",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const vendorId = String(req.params.vendorId || "");
      if (!isGuid(vendorId))
        return res.status(400).json({ ok: false, error: "INVALID_VENDOR_ID" });

      const { grade } = req.body || {};
      const validGrades = ["A", "B", "C", "D", null];
      if (!validGrades.includes(grade))
        return res.status(400).json({ ok: false, error: "INVALID_GRADE" });

      const overriddenBy = grade ? normalizeEmail(req.auth.email) : null;

      // Get existing computed grade
      const existing = await execQuery(
        "SELECT TOP 1 ComputedGrade FROM dbo.VendorGrades WHERE VendorId=TRY_CONVERT(uniqueidentifier, @vendorId)",
        { vendorId }
      );

      if (!existing.recordset || existing.recordset.length === 0) {
        // No grade row yet, compute first
        await autoComputeGrade(vendorId);
      }

      const computedGrade =
        existing.recordset &&
        existing.recordset[0] &&
        existing.recordset[0].ComputedGrade
          ? String(existing.recordset[0].ComputedGrade)
          : null;

      const finalGrade = grade || computedGrade;

      await execQuery(
        `UPDATE dbo.VendorGrades SET
AdminOverrideGrade=@Override, FinalGrade=@FinalGrade,
OverriddenBy=@OverriddenBy, OverriddenAt=CASE WHEN @Override IS NOT NULL THEN SYSUTCDATETIME() ELSE NULL END,
UpdatedAt=SYSUTCDATETIME()
WHERE VendorId=TRY_CONVERT(uniqueidentifier, @vendorId)`,
        {
          vendorId,
          Override: grade || null,
          FinalGrade: finalGrade,
          OverriddenBy: overriddenBy,
        }
      );

      return res.json({ ok: true, finalGrade });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: "OVERRIDE_GRADE_FAILED",
        details: String(e),
      });
    }
  }
);

/** Admin: get all ratings for a vendor (read-only view) */
app.get(
  "/api/admin/ratings/:vendorId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const vendorId = String(req.params.vendorId || "");
      if (!isGuid(vendorId))
        return res.status(400).json({ ok: false, error: "INVALID_VENDOR_ID" });

      const r = await execQuery(
        `SELECT SectionType, ParameterKey, Rating, RatedBy, RatedAt
FROM dbo.VendorRatings WHERE VendorId=TRY_CONVERT(uniqueidentifier, @vendorId)
ORDER BY SectionType, ParameterKey`,
        { vendorId }
      );

      const ratings = (r.recordset || []).map((row) => ({
        sectionType: String(row.SectionType),
        parameterKey: String(row.ParameterKey),
        rating: Number(row.Rating),
        ratedBy: String(row.RatedBy),
        ratedAt: new Date(row.RatedAt).toISOString(),
      }));

      return res.json({ ok: true, ratings });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: "GET_ALL_RATINGS_FAILED",
        details: String(e),
      });
    }
  }
);

/* ---------- Due Diligence (kept as-is) ---------- */

app.post(
  "/api/admin/due-diligence/assign",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const vendorId = String(
        req.body && req.body.vendorId ? req.body.vendorId : ""
      );
      if (!isGuid(vendorId))
        return res.status(400).json({ ok: false, error: "INVALID_VENDOR_ID" });

      const v = await execQuery(
        "SELECT TOP 1 VendorId FROM dbo.Vendors WHERE VendorId=TRY_CONVERT(uniqueidentifier, @vendorId)",
        { vendorId }
      );
      if (!v.recordset || v.recordset.length === 0)
        return res.status(404).json({ ok: false, error: "VENDOR_NOT_FOUND" });

      await execQuery(
        `MERGE dbo.DueDiligenceVerifications AS t
USING (SELECT @VendorId AS VendorId) AS s ON (t.VendorId = TRY_CONVERT(uniqueidentifier, s.VendorId))
WHEN MATCHED THEN UPDATE SET OverallStatus='in_progress',AssignedAt=SYSUTCDATETIME(),CompletedAt=NULL,VerifiedBy=NULL,UpdatedAt=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (VendorId,OverallStatus,AssignedAt) VALUES (TRY_CONVERT(uniqueidentifier,@VendorId),'in_progress',SYSUTCDATETIME());`,
        { VendorId: vendorId }
      );

      await execQuery(
        `UPDATE dbo.VendorClassifications SET DueDiligenceSent=1,DueDiligenceDate=SYSUTCDATETIME(),UpdatedAt=SYSUTCDATETIME()
WHERE VendorId=TRY_CONVERT(uniqueidentifier, @VendorId);`,
        { VendorId: vendorId }
      );

      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: "ASSIGN_DUE_DILIGENCE_FAILED",
        details: String(e),
      });
    }
  }
);

app.get(
  "/api/due-diligence/list",
  requireAuth,
  requireDueDiligence,
  async (_req, res) => {
    try {
      const r = await execQuery(
        `SELECT dd.VendorId, dd.OverallStatus, dd.AssignedAt, dd.CompletedAt, dd.VerifiedBy,
  v.Email, v.CompanyName, v.CompletionPercentage, v.Submitted, v.SubmittedAt, v.UpdatedAt
FROM dbo.DueDiligenceVerifications dd
LEFT JOIN dbo.Vendors v ON v.VendorId = dd.VendorId
ORDER BY CASE dd.OverallStatus WHEN 'in_progress' THEN 0 WHEN 'pending' THEN 1 WHEN 'verified' THEN 2 WHEN 'rejected' THEN 3 ELSE 9 END, dd.UpdatedAt DESC`
      );

      const items = (r.recordset || []).map((row) => ({
        vendorId: String(row.VendorId),
        overallStatus: String(row.OverallStatus || "pending"),
        assignedAt: row.AssignedAt
          ? new Date(row.AssignedAt).toISOString()
          : null,
        completedAt: row.CompletedAt
          ? new Date(row.CompletedAt).toISOString()
          : null,
        verifiedBy: row.VerifiedBy ? String(row.VerifiedBy) : null,
        vendor: {
          email: row.Email ? String(row.Email) : "",
          companyName: row.CompanyName ? String(row.CompanyName) : "",
          completionPercentage: Number(row.CompletionPercentage || 0),
          submitted: !!row.Submitted,
          submittedAt: row.SubmittedAt
            ? new Date(row.SubmittedAt).toISOString()
            : null,
          updatedAt: row.UpdatedAt
            ? new Date(row.UpdatedAt).toISOString()
            : null,
        },
      }));

      return res.json({ ok: true, items });
    } catch (e) {
      return res
        .status(500)
        .json({ ok: false, error: "DD_LIST_FAILED", details: String(e) });
    }
  }
);

app.get(
  "/api/due-diligence/:vendorId",
  requireAuth,
  requireDueDiligence,
  async (req, res) => {
    try {
      const vendorId = String(req.params.vendorId || "");
      if (!isGuid(vendorId))
        return res.status(400).json({ ok: false, error: "INVALID_VENDOR_ID" });

      const dd = await execQuery(
        "SELECT TOP 1 * FROM dbo.DueDiligenceVerifications WHERE VendorId=TRY_CONVERT(uniqueidentifier, @vendorId)",
        { vendorId }
      );
      const row = dd.recordset && dd.recordset[0];
      if (!row) return res.json({ ok: true, verification: null });

      return res.json({
        ok: true,
        verification: {
          vendorId: String(row.VendorId),
          companyDetails: {
            verified: !!row.CompanyDetailsVerified,
            comment: row.CompanyDetailsComment || "",
          },
          financialDetails: {
            verified: !!row.FinancialDetailsVerified,
            comment: row.FinancialDetailsComment || "",
          },
          bankDetails: {
            verified: !!row.BankDetailsVerified,
            comment: row.BankDetailsComment || "",
          },
          references: {
            verified: !!row.ReferencesVerified,
            comment: row.ReferencesComment || "",
          },
          documents: {
            verified: !!row.DocumentsVerified,
            comment: row.DocumentsComment || "",
          },
          overallStatus: String(row.OverallStatus || "pending"),
          assignedAt: row.AssignedAt
            ? new Date(row.AssignedAt).toISOString()
            : null,
          completedAt: row.CompletedAt
            ? new Date(row.CompletedAt).toISOString()
            : null,
          verifiedBy: row.VerifiedBy ? String(row.VerifiedBy) : null,
        },
      });
    } catch (e) {
      return res
        .status(500)
        .json({ ok: false, error: "DD_GET_FAILED", details: String(e) });
    }
  }
);

app.put(
  "/api/due-diligence/:vendorId",
  requireAuth,
  requireDueDiligence,
  async (req, res) => {
    try {
      const vendorId = String(req.params.vendorId || "");
      if (!isGuid(vendorId))
        return res.status(400).json({ ok: false, error: "INVALID_VENDOR_ID" });

      const body = req.body || {};
      const verification = body.verification || body;

      const overallStatus = String(verification.overallStatus || "in_progress");
      const allowed = new Set([
        "pending",
        "in_progress",
        "verified",
        "rejected",
      ]);
      if (!allowed.has(overallStatus))
        return res
          .status(400)
          .json({ ok: false, error: "INVALID_OVERALL_STATUS" });

      const cd = verification.companyDetails || {};
      const fd = verification.financialDetails || {};
      const bd = verification.bankDetails || {};
      const rf = verification.references || {};
      const dc = verification.documents || {};
      const completedAt =
        overallStatus === "verified" || overallStatus === "rejected"
          ? new Date()
          : null;

      await execQuery(
        `MERGE dbo.DueDiligenceVerifications AS t
USING (SELECT @VendorId AS VendorId) AS s ON (t.VendorId=TRY_CONVERT(uniqueidentifier,s.VendorId))
WHEN MATCHED THEN UPDATE SET
  CompanyDetailsVerified=@CDV,CompanyDetailsComment=@CDC,FinancialDetailsVerified=@FDV,FinancialDetailsComment=@FDC,
  BankDetailsVerified=@BDV,BankDetailsComment=@BDC,ReferencesVerified=@RV,ReferencesComment=@RC,
  DocumentsVerified=@DV,DocumentsComment=@DC,OverallStatus=@OS,CompletedAt=@CompletedAt,VerifiedBy=@VB,UpdatedAt=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (VendorId,CompanyDetailsVerified,CompanyDetailsComment,FinancialDetailsVerified,FinancialDetailsComment,
  BankDetailsVerified,BankDetailsComment,ReferencesVerified,ReferencesComment,DocumentsVerified,DocumentsComment,
  OverallStatus,AssignedAt,CompletedAt,VerifiedBy)
  VALUES (TRY_CONVERT(uniqueidentifier,@VendorId),@CDV,@CDC,@FDV,@FDC,@BDV,@BDC,@RV,@RC,@DV,@DC,@OS,SYSUTCDATETIME(),@CompletedAt,@VB);`,
        {
          VendorId: vendorId,
          CDV: cd.verified ? 1 : 0,
          CDC: cd.comment ? String(cd.comment) : "",
          FDV: fd.verified ? 1 : 0,
          FDC: fd.comment ? String(fd.comment) : "",
          BDV: bd.verified ? 1 : 0,
          BDC: bd.comment ? String(bd.comment) : "",
          RV: rf.verified ? 1 : 0,
          RC: rf.comment ? String(rf.comment) : "",
          DV: dc.verified ? 1 : 0,
          DC: dc.comment ? String(dc.comment) : "",
          OS: overallStatus,
          CompletedAt: completedAt,
          VB: normalizeEmail(req.auth.email),
        }
      );

      return res.json({ ok: true });
    } catch (e) {
      return res
        .status(500)
        .json({ ok: false, error: "DD_SAVE_FAILED", details: String(e) });
    }
  }
);

/* ---------- Rankings (updated for new grading) ---------- */

app.get("/api/admin/rankings", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const r = await execQuery(
      `SELECT
  v.VendorId, v.Email, v.CompanyName, v.CompletionPercentage, v.Submitted, v.SubmittedAt,
  ISNULL(g.SiteScore, 0) AS SiteScore,
  ISNULL(g.ProcurementScore, 0) AS ProcurementScore,
  ISNULL(g.FinancialScore, 0) AS FinancialScore,
  ISNULL(g.TotalScore, 0) AS TotalScore,
  g.ComputedGrade, g.AdminOverrideGrade, g.FinalGrade,
  ISNULL(c.VendorType, '') AS VendorType,
  ISNULL(c.CapexBand, '') AS CapexBand
FROM dbo.Vendors v
LEFT JOIN dbo.VendorGrades g ON g.VendorId = v.VendorId
LEFT JOIN dbo.VendorClassifications c ON c.VendorId = v.VendorId
ORDER BY ISNULL(g.TotalScore, 0) DESC, v.CompletionPercentage DESC, v.UpdatedAt DESC`
    );

    const rankings = (r.recordset || []).map((row, idx) => ({
      rank: idx + 1,
      vendorId: String(row.VendorId),
      email: String(row.Email),
      companyName: row.CompanyName ? String(row.CompanyName) : "",
      completionPercentage: Number(row.CompletionPercentage || 0),
      submitted: !!row.Submitted,
      submittedAt: row.SubmittedAt
        ? new Date(row.SubmittedAt).toISOString()
        : null,
      siteScore: Number(row.SiteScore || 0),
      procurementScore: Number(row.ProcurementScore || 0),
      financialScore: Number(row.FinancialScore || 0),
      totalScore: Number(row.TotalScore || 0),
      computedGrade: row.ComputedGrade ? String(row.ComputedGrade) : null,
      adminOverrideGrade: row.AdminOverrideGrade
        ? String(row.AdminOverrideGrade)
        : null,
      finalGrade: row.FinalGrade ? String(row.FinalGrade) : null,
      vendorType: row.VendorType ? String(row.VendorType) : null,
      capexBand: row.CapexBand ? String(row.CapexBand) : null,
    }));

    return res.json({ ok: true, rankings });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, error: "RANKINGS_FAILED", details: String(e) });
  }
});

/* ========================= Static Frontend Hosting ========================= */

function resolveDistDir() {
  const candidates = [
    path.join(__dirname, "dist"),
    path.join(__dirname, "client", "dist"),
    path.join(__dirname, "web", "dist"),
    path.join(__dirname, "..", "dist"),
  ];
  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir;
    } catch {}
  }
  return null;
}

const distDir = resolveDistDir();
if (distDir) {
  app.use(express.static(distDir, { maxAge: "1d", index: false }));
  app.get(/^\/(?!api\/).*/, (req, res, next) => {
    const indexPath = path.join(distDir, "index.html");
    return res.sendFile(indexPath);
  });
}

/* ========================= Error Handler ========================= */

app.use((err, _req, res, _next) => {
  if (String(err && err.message) === "CORS_NOT_ALLOWED")
    return res.status(403).json({ ok: false, error: "CORS_NOT_ALLOWED" });
  return res.status(500).json({
    ok: false,
    error: "INTERNAL_SERVER_ERROR",
    details: err ? String(err.stack || err.message || err) : "unknown",
  });
});

/* ========================= Start Server ========================= */

async function shutdown(server) {
  try {
    console.log("🛑 Shutting down...");
    if (server) await new Promise((resolve) => server.close(() => resolve()));
    try {
      const pool = await getPool();
      await pool.close();
    } catch {}
    process.exit(0);
  } catch (e) {
    console.error("Shutdown error:", e);
    process.exit(1);
  }
}

async function start() {
  try {
    await initSchema();
    console.log("✅ MSSQL schema ready (including grading tables)");

    const server = https.createServer(httpsOptions, app);
    server.listen(APP_PORT, APP_HOST, () => {
      console.log(`🚀 HTTPS server running at https://${APP_HOST}:${APP_PORT}`);
      if (distDir) console.log(`🧩 Serving frontend from: ${distDir}`);
      else console.log("⚠️ No dist folder found.");
      console.log("🔌 API base: /api");
    });

    process.on("SIGTERM", () => shutdown(server));
    process.on("SIGINT", () => shutdown(server));
  } catch (e) {
    console.error("❌ Failed to start server:", e);
    process.exit(1);
  }
}

start();
