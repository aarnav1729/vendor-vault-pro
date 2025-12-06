import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { 
  VendorFormData, 
  User, 
  VendorClassification, 
  ScoringMatrix,
  DueDiligenceVerification,
  DEFAULT_DOCUMENTS 
} from '@/types/vendor';

interface VendorDB extends DBSchema {
  users: {
    key: string;
    value: User;
    indexes: { 'by-email': string };
  };
  vendors: {
    key: string;
    value: VendorFormData;
    indexes: { 'by-email': string };
  };
  classifications: {
    key: string;
    value: VendorClassification;
    indexes: { 'by-vendorId': string };
  };
  scoringMatrix: {
    key: string;
    value: ScoringMatrix;
  };
  dueDiligence: {
    key: string;
    value: DueDiligenceVerification;
    indexes: { 'by-vendorId': string };
  };
}

let dbPromise: Promise<IDBPDatabase<VendorDB>> | null = null;

export const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB<VendorDB>('vendor-management-db', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          // Users store
          const userStore = db.createObjectStore('users', { keyPath: 'email' });
          userStore.createIndex('by-email', 'email');

          // Vendors store
          const vendorStore = db.createObjectStore('vendors', { keyPath: 'id' });
          vendorStore.createIndex('by-email', 'email');

          // Classifications store
          const classStore = db.createObjectStore('classifications', { keyPath: 'vendorId' });
          classStore.createIndex('by-vendorId', 'vendorId');

          // Scoring matrix store
          db.createObjectStore('scoringMatrix', { keyPath: 'id' });
        }
        
        if (oldVersion < 2) {
          // Due diligence store
          if (!db.objectStoreNames.contains('dueDiligence')) {
            const ddStore = db.createObjectStore('dueDiligence', { keyPath: 'vendorId' });
            ddStore.createIndex('by-vendorId', 'vendorId');
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
  let user = await db.get('users', email);
  
  if (!user) {
    user = {
      email,
      isAdmin: email.toLowerCase() === 'aarnav.singh@premierenergies.com',
      verified: false,
    };
    await db.put('users', user);
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
  await db.put('users', user);
  
  return otp;
};

export const verifyOTP = async (email: string, otp: string): Promise<boolean> => {
  const db = await getDB();
  const user = await db.get('users', email);
  
  if (!user || !user.otp || !user.otpExpiry) return false;
  
  const isValid = user.otp === otp && new Date(user.otpExpiry) > new Date();
  
  if (isValid) {
    user.verified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await db.put('users', user);
  }
  
  return isValid;
};

export const getUser = async (email: string): Promise<User | undefined> => {
  const db = await getDB();
  return db.get('users', email);
};

// Vendor functions
export const createEmptyVendorForm = (email: string): VendorFormData => {
  return {
    id: crypto.randomUUID(),
    email,
    companyDetails: {
      companyName: '',
      managingDirectorName: '',
      typeOfOrganisation: '',
      cinNumber: '',
      yearOfEstablishment: '',
      gstNumber: '',
      companyOrigin: '',
      panNumber: '',
      registeredAddress: {
        line1: '',
        line2: '',
        pinCode: '',
        district: '',
        state: '',
      },
      isMSME: false,
      goodsAndServices: [
        { category: '' },
        { category: '' },
        { category: '' },
      ],
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
      bankName: '',
      branch: '',
      accountNumber: '',
      ifscCode: '',
      swiftCode: '',
    },
    vendorReferences: Array(5).fill(null).map(() => ({
      companyName: '',
      poDate: '',
      currentStatus: '',
      contactPersonName: '',
      contactNumber: '',
      mailId: '',
      completionDate: '',
      poValue: 0,
      remarks: '',
    })),
    contactPersons: Array(5).fill(null).map(() => ({
      name: '',
      designation: '',
      baseLocation: '',
      contactNumber: '',
      mailId: '',
      isPrimary: false,
    })),
    documents: DEFAULT_DOCUMENTS.map(name => ({
      docName: name,
      attached: false,
      files: [],
      remarks: '',
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completionPercentage: 0,
  };
};

export const saveVendorForm = async (vendor: VendorFormData): Promise<void> => {
  const db = await getDB();
  vendor.updatedAt = new Date().toISOString();
  vendor.completionPercentage = calculateCompletion(vendor);
  await db.put('vendors', vendor);
};

export const getVendorByEmail = async (email: string): Promise<VendorFormData | undefined> => {
  const db = await getDB();
  const vendors = await db.getAllFromIndex('vendors', 'by-email', email);
  return vendors[0];
};

export const getVendorById = async (id: string): Promise<VendorFormData | undefined> => {
  const db = await getDB();
  return db.get('vendors', id);
};

export const getAllVendors = async (): Promise<VendorFormData[]> => {
  const db = await getDB();
  return db.getAll('vendors');
};

// Classification functions
export const saveClassification = async (classification: VendorClassification): Promise<void> => {
  const db = await getDB();
  await db.put('classifications', classification);
};

export const getClassification = async (vendorId: string): Promise<VendorClassification | undefined> => {
  const db = await getDB();
  return db.get('classifications', vendorId);
};

export const getAllClassifications = async (): Promise<VendorClassification[]> => {
  const db = await getDB();
  return db.getAll('classifications');
};

// Scoring Matrix functions
export const getScoringMatrix = async (): Promise<ScoringMatrix> => {
  const db = await getDB();
  let matrix = await db.get('scoringMatrix', 'default');
  
  if (!matrix) {
    matrix = {
      id: 'default',
      companyDetailsWeight: 20,
      financialDetailsWeight: 25,
      bankDetailsWeight: 15,
      referencesWeight: 25,
      documentsWeight: 15,
    };
    await db.put('scoringMatrix', matrix);
  }
  
  return matrix;
};

export const saveScoringMatrix = async (matrix: ScoringMatrix): Promise<void> => {
  const db = await getDB();
  await db.put('scoringMatrix', matrix);
};

// Utility functions
export const calculateCompletion = (vendor: VendorFormData): number => {
  let total = 0;
  let filled = 0;

  // Company Details (required fields)
  const companyRequiredFields = [
    'companyName', 'managingDirectorName', 'cinNumber', 
    'yearOfEstablishment', 'gstNumber', 'companyOrigin', 'panNumber'
  ];
  companyRequiredFields.forEach(field => {
    total++;
    if (vendor.companyDetails[field as keyof typeof vendor.companyDetails]) filled++;
  });

  // Address fields
  const addressFields = ['line1', 'pinCode', 'district', 'state'];
  addressFields.forEach(field => {
    total++;
    if (vendor.companyDetails.registeredAddress[field as keyof typeof vendor.companyDetails.registeredAddress]) filled++;
  });

  // Financial details
  const turnover = vendor.financialDetails.annualTurnover;
  total += 4;
  if (turnover.fy2022_23 > 0) filled++;
  if (turnover.fy2023_24 > 0) filled++;
  if (turnover.fy2024_25 > 0) filled++;
  if (turnover.fy2025_26 > 0) filled++;

  // Bank details
  const bankFields = ['bankName', 'branch', 'accountNumber', 'ifscCode'];
  bankFields.forEach(field => {
    total++;
    if (vendor.bankDetails[field as keyof typeof vendor.bankDetails]) filled++;
  });

  // References (at least 3)
  const validRefs = vendor.vendorReferences.filter(ref => ref.companyName && ref.poDate).length;
  total += 3;
  filled += Math.min(validRefs, 3);

  // Contact persons (at least 1)
  const validContacts = vendor.contactPersons.filter(c => c.name && c.mailId).length;
  total += 1;
  filled += Math.min(validContacts, 1);

  // Documents (at least 5 core docs)
  const attachedDocs = vendor.documents.filter(d => d.attached).length;
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
export const saveDueDiligenceVerification = async (verification: DueDiligenceVerification): Promise<void> => {
  const db = await getDB();
  await db.put('dueDiligence', verification);
};

export const getDueDiligenceVerification = async (vendorId: string): Promise<DueDiligenceVerification | undefined> => {
  const db = await getDB();
  return db.get('dueDiligence', vendorId);
};

export const getDueDiligenceVerifications = async (): Promise<DueDiligenceVerification[]> => {
  const db = await getDB();
  return db.getAll('dueDiligence');
};
