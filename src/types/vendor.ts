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
