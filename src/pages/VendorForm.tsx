import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getVendorByEmail,
  createEmptyVendorForm,
  saveVendorForm,
  submitVendorForm,
} from "@/lib/db";

import { VendorFormData, ContactPerson } from "@/types/vendor";
import { CompanyDetailsSection } from "@/components/form/CompanyDetailsSection";
import { FinancialDetailsSection } from "@/components/form/FinancialDetailsSection";
import { BankDetailsSection } from "@/components/form/BankDetailsSection";
import { VendorReferencesSection } from "@/components/form/VendorReferencesSection";
import { ContactPersonsSection } from "@/components/form/ContactPersonsSection";
import { DocumentsSection } from "@/components/form/DocumentsSection";
import { FormPreviewModal } from "@/components/form/FormPreviewModal";
import {
  Building2,
  TrendingUp,
  Landmark,
  FileCheck,
  Users,
  FolderOpen,
  Save,
  ChevronLeft,
  ChevronRight,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const SECTIONS = [
  { id: "company", label: "Company Details", icon: Building2 },
  { id: "financial", label: "Financial Details", icon: TrendingUp },
  { id: "bank", label: "Bank Details", icon: Landmark },
  { id: "references", label: "References", icon: FileCheck },
  { id: "contacts", label: "Contact Persons", icon: Users },
  { id: "documents", label: "Documents", icon: FolderOpen },
];

interface ValidationErrors {
  companyDetails: string[];
  financialDetails: string[];
  bankDetails: string[];
  references: string[];
  contacts: string[];
  documents: string[];
}

const VendorForm: React.FC = () => {
  const [formData, setFormData] = useState<VendorFormData | null>(null);
  const [activeSection, setActiveSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
    companyDetails: [],
    financialDetails: [],
    bankDetails: [],
    references: [],
    contacts: [],
    documents: [],
  });
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.verified) {
      navigate("/");
      return;
    }
    loadVendorData();
  }, [user]);

  const loadVendorData = async () => {
    if (!user?.email) return;

    let vendor = await getVendorByEmail(user.email);
    if (!vendor) {
      vendor = createEmptyVendorForm(user.email);
      // Initialize isPrimary field for contacts
      vendor.contactPersons = vendor.contactPersons.map((c, i) => ({
        ...c,
        isPrimary: false,
      }));
      vendor = await saveVendorForm(vendor);
    } else {
      // Ensure isPrimary field exists for existing data
      vendor.contactPersons = vendor.contactPersons.map((c) => ({
        ...c,
        isPrimary: c.isPrimary ?? false,
      }));
    }
    setFormData(vendor);
  };

  const validateForm = (): boolean => {
    if (!formData) return false;

    const errors: ValidationErrors = {
      companyDetails: [],
      financialDetails: [],
      bankDetails: [],
      references: [],
      contacts: [],
      documents: [],
    };

    // Company Details validation
    const cd = formData.companyDetails;
    if (!cd.companyName) errors.companyDetails.push("Company Name is required");
    if (!cd.managingDirectorName)
      errors.companyDetails.push("Managing Director/CEO Name is required");
    if (!cd.cinNumber) errors.companyDetails.push("CIN Number is required");
    if (!cd.yearOfEstablishment)
      errors.companyDetails.push("Year of Establishment is required");
    if (!cd.gstNumber) errors.companyDetails.push("GST Number is required");
    if (!cd.companyOrigin)
      errors.companyDetails.push("Company Origin is required");
    if (!cd.panNumber) errors.companyDetails.push("PAN Number is required");
    if (!cd.registeredAddress.line1)
      errors.companyDetails.push("Address Line 1 is required");
    if (!cd.registeredAddress.pinCode)
      errors.companyDetails.push("PIN Code is required");
    if (!cd.registeredAddress.district)
      errors.companyDetails.push("District is required");
    if (!cd.registeredAddress.state)
      errors.companyDetails.push("State is required");

    // Bank Details validation
    const bd = formData.bankDetails;
    if (!bd.bankName) errors.bankDetails.push("Bank Name is required");
    if (!bd.branch) errors.bankDetails.push("Branch is required");
    if (!bd.accountNumber)
      errors.bankDetails.push("Account Number is required");
    if (!bd.ifscCode) errors.bankDetails.push("IFSC Code is required");

    // Contact Persons validation
    const contacts = formData.contactPersons;
    const isContactComplete = (c: ContactPerson) =>
      c.name && c.designation && c.contactNumber && c.mailId;
    const filledContacts = contacts.filter(isContactComplete);

    if (filledContacts.length < 2) {
      errors.contacts.push("At least 2 complete contact persons are required");
    }
    if (!contacts.some((c) => c.isPrimary && isContactComplete(c))) {
      errors.contacts.push("At least one contact must be marked as primary");
    }

    // Documents validation
    const missingDocs = formData.documents.filter(
      (doc) => doc.files.length === 0
    );
    if (missingDocs.length > 0) {
      errors.documents.push(
        `Missing documents: ${missingDocs.map((d) => d.docName).join(", ")}`
      );
    }

    // References validation (at least 3 required)
    const filledRefs = formData.vendorReferences.filter(
      (ref) => ref.companyName
    );
    if (filledRefs.length < 3) {
      errors.references.push("At least 3 vendor references are required");
    }

    setValidationErrors(errors);

    const hasErrors = Object.values(errors).some((arr) => arr.length > 0);
    return !hasErrors;
  };

  const handleSave = async (opts?: { silent?: boolean }) => {
    if (!formData) return;

    setSaving(true);
    try {
      const saved = await saveVendorForm(formData); // now returns vendor from server
      setFormData(saved);
      setLastSaved(new Date());

      if (!opts?.silent) {
        toast({
          title: "Saved",
          description: "Your progress has been saved.",
        });
      }
    } catch (error) {
      if (!opts?.silent) {
        toast({
          title: "Error",
          description: "Failed to save. Please try again.",
          variant: "destructive",
        });
      }
    }
    setSaving(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const goToSection = async (index: number) => {
    if (index === activeSection) return;
    await handleSave({ silent: true });
    setActiveSection(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNext = async () => {
    await handleSave({ silent: true });

    if (activeSection < SECTIONS.length - 1) {
      setActiveSection(activeSection + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevious = () => {
    if (activeSection > 0) {
      setActiveSection(activeSection - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmitClick = async () => {
    await handleSave();
    setShowErrors(true);

    const isValid = validateForm();

    if (!isValid) {
      // Find first section with errors and navigate to it
      const sectionKeys = [
        "companyDetails",
        "financialDetails",
        "bankDetails",
        "references",
        "contacts",
        "documents",
      ];
      const firstErrorSection = sectionKeys.findIndex(
        (key) => validationErrors[key as keyof ValidationErrors].length > 0
      );

      if (firstErrorSection !== -1 && firstErrorSection !== activeSection) {
        setActiveSection(firstErrorSection);
      }

      toast({
        title: "Validation Error",
        description: "Please fill all mandatory fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    setShowPreview(true);
  };

  const handleFinalSubmit = async () => {
    if (!formData) return;

    setSubmitting(true);
    try {
      const updatedForm: any = {
        ...formData,
        completionPercentage: 100,
        updatedAt: new Date().toISOString(),
        submitted: true,
      };

      const saved = await submitVendorForm(updatedForm);
      setFormData(saved);

      setShowPreview(false);

      toast({
        title: "Submitted Successfully!",
        description: "Your vendor registration form has been submitted.",
      });
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  if (!formData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const getSectionErrors = (sectionIndex: number): string[] => {
    const keys = [
      "companyDetails",
      "financialDetails",
      "bankDetails",
      "references",
      "contacts",
      "documents",
    ];
    return validationErrors[keys[sectionIndex] as keyof ValidationErrors] || [];
  };

  const renderSection = () => {
    switch (activeSection) {
      case 0:
        return (
          <CompanyDetailsSection
            data={formData.companyDetails}
            onChange={(data) =>
              setFormData({ ...formData, companyDetails: data })
            }
          />
        );
      case 1:
        return (
          <FinancialDetailsSection
            data={formData.financialDetails}
            onChange={(data) =>
              setFormData({ ...formData, financialDetails: data })
            }
          />
        );
      case 2:
        return (
          <BankDetailsSection
            data={formData.bankDetails}
            onChange={(data) => setFormData({ ...formData, bankDetails: data })}
          />
        );
      case 3:
        return (
          <VendorReferencesSection
            data={formData.vendorReferences}
            onChange={(data) =>
              setFormData({ ...formData, vendorReferences: data })
            }
          />
        );
      case 4:
        return (
          <ContactPersonsSection
            data={formData.contactPersons}
            onChange={(data) =>
              setFormData({ ...formData, contactPersons: data })
            }
            showErrors={showErrors}
          />
        );
      case 5:
        return (
          <DocumentsSection
            data={formData.documents}
            onChange={(data) => setFormData({ ...formData, documents: data })}
            showErrors={showErrors}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">Vendor Registration</h1>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {lastSaved && (
                <span className="text-sm text-muted-foreground hidden sm:block">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Form Completion</span>
              <span className="text-sm text-muted-foreground">
                {formData.completionPercentage}%
              </span>
            </div>
            <Progress value={formData.completionPercentage} className="h-2" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <nav className="sticky top-32 space-y-1">
              {SECTIONS.map((section, index) => {
                const Icon = section.icon;
                const isActive = index === activeSection;
                const isCompleted = index < activeSection;
                const hasErrors =
                  showErrors && getSectionErrors(index).length > 0;

                return (
                  <button
                    key={section.id}
                    onClick={() => goToSection(index)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : hasErrors
                        ? "bg-destructive/10 border border-destructive/30"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isActive
                          ? "bg-primary-foreground/20"
                          : hasErrors
                          ? "bg-destructive/20 text-destructive"
                          : isCompleted
                          ? "bg-success/20 text-success"
                          : "bg-muted"
                      }`}
                    >
                      {hasErrors ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <span className="font-medium text-sm">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 max-w-4xl">
            {/* Mobile Section Tabs */}
            <div className="lg:hidden mb-6 overflow-x-auto scrollbar-thin">
              <div className="flex gap-2 pb-2">
                {SECTIONS.map((section, index) => {
                  const Icon = section.icon;
                  const isActive = index === activeSection;
                  const hasErrors =
                    showErrors && getSectionErrors(index).length > 0;

                  return (
                    <button
                      key={section.id}
                      onClick={() => goToSection(index)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : hasErrors
                          ? "bg-destructive/10 text-destructive border border-destructive/30"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {hasErrors ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section Errors Banner */}
            {showErrors && getSectionErrors(activeSection).length > 0 && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-destructive">
                      Please fix the following errors:
                    </h4>
                    <ul className="mt-2 text-sm text-destructive space-y-1">
                      {getSectionErrors(activeSection).map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Section Content */}
            {renderSection()}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={activeSection === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                Section {activeSection + 1} of {SECTIONS.length}
              </div>

              {activeSection < SECTIONS.length - 1 ? (
                <Button onClick={handleNext}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  variant="accent"
                  onClick={handleSubmitClick}
                  disabled={saving}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Review & Submit
                </Button>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Preview Modal */}
      <FormPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        onSubmit={handleFinalSubmit}
        data={formData}
        submitting={submitting}
      />
    </div>
  );
};

export default VendorForm;
