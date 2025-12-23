import { openDB, DBSchema, IDBPDatabase } from "idb";
import {
  VendorFormData,
  User,
  VendorClassification,
  ScoringMatrix,
  DueDiligenceVerification,
  DEFAULT_DOCUMENTS,
} from "@/types/vendor";

interface VendorDB extends DBSchema {
  users: {
    key: string;
    value: User;
    indexes: { "by-email": string };
  };
  vendors: {
    key: string;
    value: VendorFormData;
    indexes: { "by-email": string };
  };
  classifications: {
    key: string;
    value: VendorClassification;
    indexes: { "by-vendorId": string };
  };
  scoringMatrix: {
    key: string;
    value: ScoringMatrix;
  };
  dueDiligence: {
    key: string;
    value: DueDiligenceVerification;
    indexes: { "by-vendorId": string };
  };
}

let dbPromise: Promise<IDBPDatabase<VendorDB>> | null = null;

const API_BASE_URL = `${window.location.origin}/api`;

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init && init.headers ? init.headers : {}),
    },
    credentials: "include", // IMPORTANT for JWT cookie
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data && data.ok === false)) {
    const msg = data?.error || data?.details || `HTTP_${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

function isBrowserFile(x: any): x is File {
  return typeof File !== "undefined" && x instanceof File;
}

async function ensureStoredFile(x: any) {
  // Already StoredFile
  if (
    x &&
    typeof x === "object" &&
    typeof x.data === "string" &&
    typeof x.name === "string"
  ) {
    return x;
  }

  // Raw File -> StoredFile
  if (isBrowserFile(x)) {
    const data = await fileToBase64(x);
    return {
      id: crypto.randomUUID(),
      name: x.name,
      type: x.type || "application/octet-stream",
      size: x.size || 0,
      data,
      uploadedAt: new Date().toISOString(),
    };
  }

  return null;
}

async function normalizeVendorForSave(
  vendor: VendorFormData
): Promise<VendorFormData> {
  const v: any = { ...vendor };

  // Ensure ids
  if (!v.id) v.id = crypto.randomUUID();

  // Normalize documents: attached flag + ensure StoredFile structure
  if (Array.isArray(v.documents)) {
    v.documents = await Promise.all(
      v.documents.map(async (d: any) => {
        const filesRaw = Array.isArray(d.files) ? d.files : [];
        const files = (
          await Promise.all(filesRaw.map(ensureStoredFile))
        ).filter(Boolean);

        return {
          ...d,
          files,
          attached: files.length > 0, // keep compatibility if UI uses attached
        };
      })
    );
  }

  // MSME certificate if present as File
  if (v.companyDetails?.msmeCertificate) {
    const converted = await ensureStoredFile(v.companyDetails.msmeCertificate);
    if (converted) v.companyDetails.msmeCertificate = converted;
  }

  // Turnover attachments if present as File
  const atts = v.financialDetails?.annualTurnover?.attachments;
  if (Array.isArray(atts)) {
    const converted = (await Promise.all(atts.map(ensureStoredFile))).filter(
      Boolean
    );
    v.financialDetails.annualTurnover.attachments = converted;
  }

  // Contact persons: ensure isPrimary exists
  if (Array.isArray(v.contactPersons)) {
    v.contactPersons = v.contactPersons.map((c: any) => ({
      ...c,
      isPrimary: c.isPrimary ?? false,
    }));
  }

  // Update timestamps + completion
  v.updatedAt = new Date().toISOString();
  v.completionPercentage = calculateCompletion(v);

  return v as VendorFormData;
}

export const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB<VendorDB>("vendor-management-db", 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          // Users store
          const userStore = db.createObjectStore("users", { keyPath: "email" });
          userStore.createIndex("by-email", "email");

          // Vendors store
          const vendorStore = db.createObjectStore("vendors", {
            keyPath: "id",
          });
          vendorStore.createIndex("by-email", "email");

          // Classifications store
          const classStore = db.createObjectStore("classifications", {
            keyPath: "vendorId",
          });
          classStore.createIndex("by-vendorId", "vendorId");

          // Scoring matrix store
          db.createObjectStore("scoringMatrix", { keyPath: "id" });
        }

        if (oldVersion < 2) {
          // Due diligence store
          if (!db.objectStoreNames.contains("dueDiligence")) {
            const ddStore = db.createObjectStore("dueDiligence", {
              keyPath: "vendorId",
            });
            ddStore.createIndex("by-vendorId", "vendorId");
          }
        }
      },
    });
  }
  return dbPromise;
};

// User functions
export const createOrGetUser = async (email: string): Promise<User> => {
  const db = await getDB();
  let user = await db.get("users", email);

  if (!user) {
    user = {
      email,
      isAdmin: email.toLowerCase() === "aarnav.singh@premierenergies.com",
      verified: false,
    };
    await db.put("users", user);
  }

  return user;
};

export const generateOTP = async (email: string): Promise<string> => {
  const db = await getDB();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  const user = await createOrGetUser(email);
  user.otp = otp;
  user.otpExpiry = expiry;
  await db.put("users", user);

  return otp;
};

export const verifyOTP = async (
  email: string,
  otp: string
): Promise<boolean> => {
  const db = await getDB();
  const user = await db.get("users", email);

  if (!user || !user.otp || !user.otpExpiry) return false;

  const isValid = user.otp === otp && new Date(user.otpExpiry) > new Date();

  if (isValid) {
    user.verified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await db.put("users", user);
  }

  return isValid;
};

export const getUser = async (email: string): Promise<User | undefined> => {
  const db = await getDB();
  return db.get("users", email);
};

// Vendor functions
export const createEmptyVendorForm = (email: string): VendorFormData => {
  return {
    id: crypto.randomUUID(),
    email,
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
      goodsAndServices: [{ category: "" }, { category: "" }, { category: "" }],
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completionPercentage: 0,
  };
};

export const saveVendorForm = async (
  vendor: VendorFormData
): Promise<VendorFormData> => {
  const db = await getDB();

  // Normalize (also converts File -> base64 StoredFile)
  const normalized = await normalizeVendorForSave(vendor);

  try {
    // Save to server (primary)
    const saved = await apiJson<{ ok: true; vendor: VendorFormData }>(
      "/vendor/save",
      {
        method: "POST",
        body: JSON.stringify({ vendor: normalized }),
      }
    );

    // Cache locally
    await db.put("vendors", saved.vendor);

    // IMPORTANT: return the vendor so UI can stay in sync with server-computed completionPercentage/updatedAt
    return saved.vendor;
  } catch (e) {
    // Ensure "everything is saved" at least locally even if server fails (offline/500/etc.)
    try {
      await db.put("vendors", normalized);
    } catch {
      // ignore local cache failure
    }
    throw e;
  }
};

export const submitVendorForm = async (
  vendor: VendorFormData
): Promise<VendorFormData> => {
  const db = await getDB();

  const normalized: any = await normalizeVendorForSave(vendor);
  normalized.submitted = true;
  normalized.completionPercentage = 100;

  const saved = await apiJson<{ ok: true; vendor: VendorFormData }>(
    "/vendor/submit",
    {
      method: "POST",
      body: JSON.stringify({ vendor: normalized }),
    }
  );

  await db.put("vendors", saved.vendor);
  return saved.vendor;
};

export const getVendorByEmail = async (
  _email: string
): Promise<VendorFormData | undefined> => {
  // Server is source of truth for the logged-in vendor
  try {
    const data = await apiJson<{ ok: true; vendor: VendorFormData }>(
      "/vendor/me"
    );
    const vendor = data.vendor;

    // Cache locally (best-effort)
    try {
      const db = await getDB();
      await db.put("vendors", vendor);
    } catch {
      // ignore cache failure
    }

    return vendor;
  } catch {
    // Fallback: local cache only (offline scenario)
    const db = await getDB();
    const vendors = await db.getAllFromIndex("vendors", "by-email", _email);
    if (!vendors.length) return undefined;

    // pick latest
    vendors.sort((a, b) =>
      (b.updatedAt || "").localeCompare(a.updatedAt || "")
    );
    return vendors[0];
  }
};

export const getVendorById = async (
  id: string
): Promise<VendorFormData | undefined> => {
  const db = await getDB();
  return db.get("vendors", id);
};

export const getAllVendors = async (): Promise<VendorFormData[]> => {
  const db = await getDB();
  return db.getAll("vendors");
};

// Classification functions
export const saveClassification = async (
  classification: VendorClassification
): Promise<void> => {
  const db = await getDB();
  await db.put("classifications", classification);
};

export const getClassification = async (
  vendorId: string
): Promise<VendorClassification | undefined> => {
  const db = await getDB();
  return db.get("classifications", vendorId);
};

export const getAllClassifications = async (): Promise<
  VendorClassification[]
> => {
  const db = await getDB();
  return db.getAll("classifications");
};

// Scoring Matrix functions
export const getScoringMatrix = async (): Promise<ScoringMatrix> => {
  const db = await getDB();
  let matrix = await db.get("scoringMatrix", "default");

  if (!matrix) {
    matrix = {
      id: "default",
      companyDetailsWeight: 20,
      financialDetailsWeight: 25,
      bankDetailsWeight: 15,
      referencesWeight: 25,
      documentsWeight: 15,
    };
    await db.put("scoringMatrix", matrix);
  }

  return matrix;
};

export const saveScoringMatrix = async (
  matrix: ScoringMatrix
): Promise<void> => {
  const db = await getDB();
  await db.put("scoringMatrix", matrix);
};

// Utility functions
export const calculateCompletion = (vendor: VendorFormData): number => {
  let total = 0;
  let filled = 0;

  // Company Details (required fields)
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
    if (vendor.companyDetails[field as keyof typeof vendor.companyDetails])
      filled++;
  });

  // Address fields
  const addressFields = ["line1", "pinCode", "district", "state"];
  addressFields.forEach((field) => {
    total++;
    if (
      vendor.companyDetails.registeredAddress[
        field as keyof typeof vendor.companyDetails.registeredAddress
      ]
    )
      filled++;
  });

  // Financial details
  const turnover = vendor.financialDetails.annualTurnover;
  total += 4;
  if (turnover.fy2022_23 > 0) filled++;
  if (turnover.fy2023_24 > 0) filled++;
  if (turnover.fy2024_25 > 0) filled++;
  if (turnover.fy2025_26 > 0) filled++;

  // Bank details
  const bankFields = ["bankName", "branch", "accountNumber", "ifscCode"];
  bankFields.forEach((field) => {
    total++;
    if (vendor.bankDetails[field as keyof typeof vendor.bankDetails]) filled++;
  });

  // References (at least 3)
  const validRefs = vendor.vendorReferences.filter(
    (ref) => ref.companyName && ref.poDate
  ).length;
  total += 3;
  filled += Math.min(validRefs, 3);

  // Contact persons (at least 1)
  const validContacts = vendor.contactPersons.filter(
    (c) => c.name && c.mailId
  ).length;
  total += 1;
  filled += Math.min(validContacts, 1);

  // Documents (at least 5 core docs) — match backend (files length)
  const attachedDocs = vendor.documents.filter(
    (d) => Array.isArray(d.files) && d.files.length > 0
  ).length;
  total += 5;
  filled += Math.min(attachedDocs, 5);

  return Math.round((filled / total) * 100);
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
};

// Due Diligence functions
export const saveDueDiligenceVerification = async (
  verification: DueDiligenceVerification
): Promise<void> => {
  const db = await getDB();
  await db.put("dueDiligence", verification);
};

export const getDueDiligenceVerification = async (
  vendorId: string
): Promise<DueDiligenceVerification | undefined> => {
  const db = await getDB();
  return db.get("dueDiligence", vendorId);
};

export const getDueDiligenceVerifications = async (): Promise<
  DueDiligenceVerification[]
> => {
  const db = await getDB();
  return db.getAll("dueDiligence");
};
