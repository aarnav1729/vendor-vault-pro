export interface Address {
  line1: string;
  line2: string;
  pinCode: string;
  district: string;
  state: string;
}

export interface GoodsService {
  category: string;
  otherDescription?: string;
}

export interface CompanyDetails {
  companyName: string;
  managingDirectorName: string;
  typeOfOrganisation: string;
  cinNumber: string;
  yearOfEstablishment: string;
  gstNumber: string;
  companyOrigin: string;
  panNumber: string;
  registeredAddress: Address;
  isMSME: boolean;
  msmeCertificate?: StoredFile;
  goodsAndServices: GoodsService[];
  companyWebsite?: string;
}

export interface AnnualTurnover {
  fy2022_23: number;
  fy2023_24: number;
  fy2024_25: number;
  fy2025_26: number;
  attachments: StoredFile[];
}

export interface YearlyEmployment {
  direct: number;
  indirect: number;
  total: number;
}

export interface EmploymentDetails {
  fy2022_23: YearlyEmployment;
  fy2023_24: YearlyEmployment;
  fy2024_25: YearlyEmployment;
  fy2025_26: YearlyEmployment;
}

export interface FinancialDetails {
  annualTurnover: AnnualTurnover;
  employmentDetails: EmploymentDetails;
}

export interface BankDetails {
  bankName: string;
  branch: string;
  accountNumber: string;
  ifscCode: string;
  swiftCode: string;
}

export interface VendorReference {
  companyName: string;
  poDate: string;
  currentStatus: string;
  contactPersonName: string;
  contactNumber: string;
  mailId: string;
  completionDate: string;
  poValue: number;
  remarks?: string;
}

export interface ContactPerson {
  name: string;
  designation: string;
  baseLocation: string;
  contactNumber: string;
  mailId: string;
  isPrimary: boolean;
}

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64
  uploadedAt: string;
}

export interface VendorDocument {
  docName: string;
  attached: boolean;
  files: StoredFile[];
  remarks?: string;
}

export interface VendorFormData {
  id?: string;
  email: string;
  companyDetails: CompanyDetails;
  financialDetails: FinancialDetails;
  bankDetails: BankDetails;
  vendorReferences: VendorReference[];
  contactPersons: ContactPerson[];
  documents: VendorDocument[];
  createdAt: string;
  updatedAt: string;
  completionPercentage: number;
}

export type VendorType = "capex" | "opex" | null;
export type OpexSubType = "raw_material" | "consumables" | "service" | null;
export type CapexSubType =
  | "civil"
  | "plant_machinery"
  | "utilities"
  | "service"
  | null;

export type CapexBand =
  | "less_than_1L"
  | "1L_to_5L"
  | "5L_to_10L"
  | "10L_to_20L"
  | "20L_to_50L"
  | "50L_to_1Cr"
  | "1Cr_to_5Cr"
  | "5Cr_to_10Cr"
  | "10Cr_to_25Cr"
  | "25Cr_to_50Cr"
  | "50Cr_to_100Cr"
  | "more_than_100Cr"
  | null;

/* ========================= NEW GRADING SYSTEM ========================= */

/** Rating value: 1–5 */
export type RatingValue = 1 | 2 | 3 | 4 | 5;

export const RATING_LABELS: Record<number, string> = {
  1: "Very Poor / Unacceptable",
  2: "Poor",
  3: "Average / Acceptable",
  4: "Good",
  5: "Excellent / Best in class",
};

/** Section types for reviewer assignment */
export type GradingSectionType = "site" | "procurement" | "financial";

export const SECTION_LABELS: Record<GradingSectionType, string> = {
  site: "Site Performance",
  procurement: "Procurement Performance",
  financial: "Financial Performance",
};

export const SECTION_RESPONSIBILITY: Record<GradingSectionType, string> = {
  site: "Site Team",
  procurement: "Concerned Procurement Team Member",
  financial: "Finance Team / CAPEX Team",
};

export const SECTION_WEIGHT: Record<GradingSectionType, number> = {
  site: 45,
  procurement: 30,
  financial: 25,
};

/** A single grading parameter definition */
export interface GradingParameter {
  key: string;
  srNo: number;
  name: string;
  description: string;
  weight: number; // absolute weight out of 100 (e.g. 10 means 10%)
  section: GradingSectionType;
}

/* ---------- Site Performance Parameters (45%) ---------- */
export const SITE_PARAMETERS: GradingParameter[] = [
  {
    key: "material_timely_delivery",
    srNo: 1,
    name: "Material Timely Delivery",
    description:
      "Adherence to agreed delivery schedules, avoidance of site stoppages",
    weight: 10,
    section: "site",
  },
  {
    key: "support_at_site",
    srNo: 2,
    name: "Support at Site",
    description:
      "Availability of supervisors, engineers, troubleshooting support",
    weight: 7,
    section: "site",
  },
  {
    key: "execution_time",
    srNo: 3,
    name: "Execution Time at Site",
    description: "Ability to meet milestones and closure timelines",
    weight: 7,
    section: "site",
  },
  {
    key: "safety_compliance",
    srNo: 4,
    name: "Safety Compliance",
    description: "PPE usage, safety documentation, incident history",
    weight: 7,
    section: "site",
  },
  {
    key: "workmanship_quality",
    srNo: 5,
    name: "Workmanship Quality",
    description: "Compliance with specs, rework percentage, final acceptance",
    weight: 7,
    section: "site",
  },
  {
    key: "planning_coordination",
    srNo: 6,
    name: "Planning & Coordination",
    description:
      "Coordination with site team, method statements, work sequencing",
    weight: 3,
    section: "site",
  },
  {
    key: "responsiveness_rectification",
    srNo: 7,
    name: "Responsiveness & Rectification",
    description: "Speed and quality of defect rectification",
    weight: 4,
    section: "site",
  },
];

/* ---------- Procurement Performance Parameters (30%) ---------- */
export const PROCUREMENT_PARAMETERS: GradingParameter[] = [
  {
    key: "timely_response_rfq",
    srNo: 1,
    name: "Timely Response to RFQ",
    description: "Speed and completeness of RFQ responses",
    weight: 5,
    section: "procurement",
  },
  {
    key: "negotiation_approach",
    srNo: 2,
    name: "Negotiation Approach",
    description: "Commercial flexibility, cost realism, value orientation",
    weight: 5,
    section: "procurement",
  },
  {
    key: "data_sharing",
    srNo: 3,
    name: "Data Sharing",
    description: "Accuracy & timeliness of technical/commercial documents",
    weight: 5,
    section: "procurement",
  },
  {
    key: "flexibility_payment_terms",
    srNo: 4,
    name: "Flexibility on Payment Terms",
    description: "Willingness to align with company payment structure",
    weight: 5,
    section: "procurement",
  },
  {
    key: "timely_lc_bg_submission",
    srNo: 5,
    name: "Timely LC / BG Submission",
    description: "Compliance with contractual financial securities",
    weight: 5,
    section: "procurement",
  },
  {
    key: "no_delivery_hold_payment",
    srNo: 6,
    name: "No Delivery / Work Hold due to Payment",
    description: "Professional handling of payment cycles",
    weight: 3,
    section: "procurement",
  },
  {
    key: "contractual_compliance",
    srNo: 7,
    name: "Contractual Compliance",
    description: "Adherence to PO/contract terms without disputes",
    weight: 2,
    section: "procurement",
  },
];

/* ---------- Financial Performance Parameters (25%) ---------- */
export const FINANCIAL_PARAMETERS: GradingParameter[] = [
  {
    key: "revenue_trend",
    srNo: 1,
    name: "Revenue Trend (3 yrs)",
    description: "Stable / growing revenue, no sharp drops",
    weight: 6,
    section: "financial",
  },
  {
    key: "profitability_trend",
    srNo: 2,
    name: "Profitability Trend",
    description: "Positive & improving EBITDA/PAT",
    weight: 6,
    section: "financial",
  },
  {
    key: "liquidity_position",
    srNo: 3,
    name: "Liquidity Position",
    description: "Current ratio, WC adequacy",
    weight: 5,
    section: "financial",
  },
  {
    key: "debt_solvency",
    srNo: 4,
    name: "Debt & Solvency",
    description: "Debt-equity, interest coverage",
    weight: 4,
    section: "financial",
  },
  {
    key: "cash_flow_health",
    srNo: 5,
    name: "Cash Flow Health",
    description: "Operating cash flow positive",
    weight: 4,
    section: "financial",
  },
];

/** All parameters combined */
export const ALL_GRADING_PARAMETERS: GradingParameter[] = [
  ...SITE_PARAMETERS,
  ...PROCUREMENT_PARAMETERS,
  ...FINANCIAL_PARAMETERS,
];

/** Get parameters for a section */
export function getParametersForSection(
  section: GradingSectionType
): GradingParameter[] {
  switch (section) {
    case "site":
      return SITE_PARAMETERS;
    case "procurement":
      return PROCUREMENT_PARAMETERS;
    case "financial":
      return FINANCIAL_PARAMETERS;
  }
}

/* ---------- Reviewer Assignment ---------- */
export interface ReviewerAssignment {
  id?: number;
  vendorId: string;
  sectionType: GradingSectionType;
  reviewerEmail: string;
  assignedBy: string;
  assignedAt: string;
}

/* ---------- Vendor Rating (individual parameter) ---------- */
export interface VendorRating {
  vendorId: string;
  sectionType: GradingSectionType;
  parameterKey: string;
  rating: RatingValue;
  ratedBy: string;
  ratedAt: string;
}

/** All ratings for a section submitted by one reviewer */
export interface SectionRatings {
  vendorId: string;
  sectionType: GradingSectionType;
  ratings: Record<string, number>; // parameterKey -> rating (1-5)
  ratedBy: string;
  submittedAt?: string;
}

/* ---------- Vendor Grade ---------- */
export type GradeCategory = "A" | "B" | "C" | "D";

export interface GradeThreshold {
  minScore: number;
  grade: GradeCategory;
  label: string;
  category: string;
  financialGate: string;
}

export const GRADE_THRESHOLDS: GradeThreshold[] = [
  {
    minScore: 85,
    grade: "A",
    label: "Strategic Vendor",
    category: "Strategic Vendor",
    financialGate: "Strong financials",
  },
  {
    minScore: 70,
    grade: "B",
    label: "Approved Vendor",
    category: "Approved Vendor",
    financialGate: "Acceptable",
  },
  {
    minScore: 55,
    grade: "C",
    label: "Conditional Vendor",
    category: "Conditional Vendor",
    financialGate: "Financial watchlist",
  },
  {
    minScore: 0,
    grade: "D",
    label: "High-Risk Vendor",
    category: "High-Risk Vendor",
    financialGate: "Avoid / short-term only",
  },
];

export function getGradeForScore(score: number): GradeThreshold {
  for (const t of GRADE_THRESHOLDS) {
    if (score >= t.minScore) return t;
  }
  return GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1];
}

/**
 * Compute section score from ratings.
 * Formula: sum of ((rating / 5) * weight * 100) for each parameter
 * But since weight is already in %, result = sum of ((rating/5) * weight)
 */
export function computeSectionScore(
  section: GradingSectionType,
  ratings: Record<string, number>
): number {
  const params = getParametersForSection(section);
  let score = 0;
  for (const p of params) {
    const rating = ratings[p.key] || 0;
    score += (rating / 5) * p.weight;
  }
  return Math.round(score * 100) / 100;
}

export interface VendorGrade {
  vendorId: string;
  siteScore: number;
  procurementScore: number;
  financialScore: number;
  totalScore: number;
  computedGrade: GradeCategory | null;
  adminOverrideGrade: GradeCategory | null;
  finalGrade: GradeCategory | null;
  computedAt: string | null;
  overriddenBy: string | null;
  overriddenAt: string | null;
}

/** Status of review for a vendor (admin view) */
export interface VendorReviewStatus {
  vendorId: string;
  site: {
    assigned: boolean;
    reviewerEmail: string | null;
    submitted: boolean;
    score: number;
  };
  procurement: {
    assigned: boolean;
    reviewerEmail: string | null;
    submitted: boolean;
    score: number;
  };
  financial: {
    assigned: boolean;
    reviewerEmail: string | null;
    submitted: boolean;
    score: number;
  };
  grade: VendorGrade | null;
}

/* ========================= LEGACY (kept for backward compat) ========================= */

export interface VendorScores {
  companyDetails: number;
  financialDetails: number;
  bankDetails: number;
  references: number;
  documents: number;
}

export interface FieldVerification {
  verified: boolean;
  comment?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface DueDiligenceVerification {
  vendorId: string;
  companyDetails: FieldVerification;
  financialDetails: FieldVerification;
  bankDetails: FieldVerification;
  references: FieldVerification;
  documents: FieldVerification;
  overallStatus: "pending" | "in_progress" | "verified" | "rejected";
  assignedAt: string;
  completedAt?: string;
}

export interface VendorClassification {
  vendorId: string;
  vendorType: VendorType;
  opexSubType: OpexSubType;
  capexSubType: CapexSubType;
  capexBand: CapexBand;
  scores: VendorScores;
  totalScore: number;
  notes?: string;
  dueDiligenceSent: boolean;
  dueDiligenceDate?: string;
  infoRequestSent: boolean;
  infoRequestDate?: string;
}

export interface ScoringMatrix {
  id: string;
  companyDetailsWeight: number;
  financialDetailsWeight: number;
  bankDetailsWeight: number;
  referencesWeight: number;
  documentsWeight: number;
}

export interface User {
  email: string;
  isAdmin: boolean;
  isReviewer?: boolean;
  isDueDiligence?: boolean;
  otp?: string;
  otpExpiry?: string;
  verified: boolean;
}

export const ADMIN_EMAILS = [
  "aarnav.singh@premierenergies.com",
  "nilesh.gaidhane@premierenergies.com",
  "msudhir@premierenergies.com",
  "sivasankar.g@premierenergies.com",
];

export const ADMIN_EMAIL = ADMIN_EMAILS[0];

export const DUE_DILIGENCE_EMAIL = "duediligence@premierenergies.com";

export const ORGANISATION_TYPES = [
  "Private Limited",
  "Public Limited",
  "Partnership",
  "LLP",
  "Sole Proprietorship",
  "OPC",
  "Other",
];

export const COMPANY_ORIGINS = ["Indian", "Foreign", "Joint Venture"];

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Puducherry",
  "Chandigarh",
  "Andaman and Nicobar Islands",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Lakshadweep",
];

export const GOODS_SERVICES_CATEGORIES = [
  "Raw Materials",
  "Electrical Components",
  "Mechanical Parts",
  "IT Services",
  "Logistics",
  "Consulting",
  "Manufacturing Equipment",
  "Safety Equipment",
  "Office Supplies",
  "Construction Materials",
  "Solar Panels",
  "Inverters",
  "Cables & Wiring",
  "Others",
];

export const REFERENCE_STATUS_OPTIONS = [
  "In Progress",
  "Completed",
  "On Hold",
  "Cancelled",
];

export const DEFAULT_DOCUMENTS = [
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

export const CAPEX_BANDS: { value: CapexBand; label: string }[] = [
  { value: "less_than_1L", label: "< ₹1 Lakh" },
  { value: "1L_to_5L", label: "₹1L - ₹5L" },
  { value: "5L_to_10L", label: "₹5L - ₹10L" },
  { value: "10L_to_20L", label: "₹10L - ₹20L" },
  { value: "20L_to_50L", label: "₹20L - ₹50L" },
  { value: "50L_to_1Cr", label: "₹50L - ₹1Cr" },
  { value: "1Cr_to_5Cr", label: "₹1Cr - ₹5Cr" },
  { value: "5Cr_to_10Cr", label: "₹5Cr - ₹10Cr" },
  { value: "10Cr_to_25Cr", label: "₹10Cr - ₹25Cr" },
  { value: "25Cr_to_50Cr", label: "₹25Cr - ₹50Cr" },
  { value: "50Cr_to_100Cr", label: "₹50Cr - ₹100Cr" },
  { value: "more_than_100Cr", label: "> ₹100Cr" },
];
