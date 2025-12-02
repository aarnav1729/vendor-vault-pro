import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getVendorByEmail, createEmptyVendorForm, saveVendorForm } from '@/lib/db';
import { VendorFormData } from '@/types/vendor';
import { CompanyDetailsSection } from '@/components/form/CompanyDetailsSection';
import { FinancialDetailsSection } from '@/components/form/FinancialDetailsSection';
import { BankDetailsSection } from '@/components/form/BankDetailsSection';
import { VendorReferencesSection } from '@/components/form/VendorReferencesSection';
import { ContactPersonsSection } from '@/components/form/ContactPersonsSection';
import { DocumentsSection } from '@/components/form/DocumentsSection';
import { 
  Building2, TrendingUp, Landmark, FileCheck, Users, FolderOpen, 
  Save, ChevronLeft, ChevronRight, LogOut, CheckCircle2
} from 'lucide-react';

const SECTIONS = [
  { id: 'company', label: 'Company Details', icon: Building2 },
  { id: 'financial', label: 'Financial Details', icon: TrendingUp },
  { id: 'bank', label: 'Bank Details', icon: Landmark },
  { id: 'references', label: 'References', icon: FileCheck },
  { id: 'contacts', label: 'Contact Persons', icon: Users },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
];

const VendorForm: React.FC = () => {
  const [formData, setFormData] = useState<VendorFormData | null>(null);
  const [activeSection, setActiveSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.verified) {
      navigate('/');
      return;
    }
    loadVendorData();
  }, [user]);

  const loadVendorData = async () => {
    if (!user?.email) return;
    
    let vendor = await getVendorByEmail(user.email);
    if (!vendor) {
      vendor = createEmptyVendorForm(user.email);
      await saveVendorForm(vendor);
    }
    setFormData(vendor);
  };

  const handleSave = async () => {
    if (!formData) return;
    
    setSaving(true);
    try {
      await saveVendorForm(formData);
      setLastSaved(new Date());
      toast({
        title: 'Saved',
        description: 'Your progress has been saved.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save. Please try again.',
        variant: 'destructive',
      });
    }
    setSaving(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNext = async () => {
    await handleSave();
    if (activeSection < SECTIONS.length - 1) {
      setActiveSection(activeSection + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (activeSection > 0) {
      setActiveSection(activeSection - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!formData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case 0:
        return (
          <CompanyDetailsSection
            data={formData.companyDetails}
            onChange={(data) => setFormData({ ...formData, companyDetails: data })}
          />
        );
      case 1:
        return (
          <FinancialDetailsSection
            data={formData.financialDetails}
            onChange={(data) => setFormData({ ...formData, financialDetails: data })}
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
            onChange={(data) => setFormData({ ...formData, vendorReferences: data })}
          />
        );
      case 4:
        return (
          <ContactPersonsSection
            data={formData.contactPersons}
            onChange={(data) => setFormData({ ...formData, contactPersons: data })}
          />
        );
      case 5:
        return (
          <DocumentsSection
            data={formData.documents}
            onChange={(data) => setFormData({ ...formData, documents: data })}
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
              <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
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
              <span className="text-sm text-muted-foreground">{formData.completionPercentage}%</span>
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
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(index)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-soft'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isActive 
                        ? 'bg-primary-foreground/20' 
                        : isCompleted 
                          ? 'bg-success/20 text-success'
                          : 'bg-muted'
                    }`}>
                      {isCompleted ? (
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
                  
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(index)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </div>

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
                <Button variant="accent" onClick={handleSave} disabled={saving}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Submit Form
                </Button>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default VendorForm;
