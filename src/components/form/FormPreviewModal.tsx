import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { VendorFormData } from '@/types/vendor';
import { 
  Building2, TrendingUp, Landmark, FileCheck, Users, FolderOpen,
  CheckCircle2, FileText, Star, ChevronLeft, ChevronRight
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  data: VendorFormData;
  submitting: boolean;
}

const STEPS = [
  { id: 'company', label: 'Company Details', icon: Building2 },
  { id: 'financial', label: 'Financial Details', icon: TrendingUp },
  { id: 'bank', label: 'Bank Details', icon: Landmark },
  { id: 'references', label: 'References', icon: FileCheck },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'declaration', label: 'Declaration', icon: FileText },
];

export const FormPreviewModal: React.FC<Props> = ({ 
  open, 
  onClose, 
  onSubmit, 
  data,
  submitting 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [undertakingAccepted, setUndertakingAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const canSubmit = undertakingAccepted && privacyAccepted;
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const formatCurrency = (value: number) => {
    if (!value) return '—';
    return '₹' + new Intl.NumberFormat('en-IN').format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN');
  };

  const handleNext = () => {
    if (!isLastStep) setCurrentStep(prev => prev + 1);
  };

  const handlePrevious = () => {
    if (!isFirstStep) setCurrentStep(prev => prev - 1);
  };

  const handleClose = () => {
    setCurrentStep(0);
    setUndertakingAccepted(false);
    setPrivacyAccepted(false);
    onClose();
  };

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'company':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Company Name:</span> <strong>{data.companyDetails.companyName || '—'}</strong></div>
              <div><span className="text-muted-foreground">MD/CEO:</span> <strong>{data.companyDetails.managingDirectorName || '—'}</strong></div>
              <div><span className="text-muted-foreground">Organisation Type:</span> <strong>{data.companyDetails.typeOfOrganisation || '—'}</strong></div>
              <div><span className="text-muted-foreground">CIN:</span> <strong>{data.companyDetails.cinNumber || '—'}</strong></div>
              <div><span className="text-muted-foreground">Year of Establishment:</span> <strong>{data.companyDetails.yearOfEstablishment || '—'}</strong></div>
              <div><span className="text-muted-foreground">GST Number:</span> <strong>{data.companyDetails.gstNumber || '—'}</strong></div>
              <div><span className="text-muted-foreground">PAN Number:</span> <strong>{data.companyDetails.panNumber || '—'}</strong></div>
              <div><span className="text-muted-foreground">Company Origin:</span> <strong>{data.companyDetails.companyOrigin || '—'}</strong></div>
              <div><span className="text-muted-foreground">MSME:</span> <strong>{data.companyDetails.isMSME ? 'Yes' : 'No'}</strong></div>
              <div><span className="text-muted-foreground">Website:</span> <strong>{data.companyDetails.companyWebsite || '—'}</strong></div>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Address:</span>
              <p className="font-medium mt-1">
                {data.companyDetails.registeredAddress.line1}
                {data.companyDetails.registeredAddress.line2 && `, ${data.companyDetails.registeredAddress.line2}`}
                <br />
                {data.companyDetails.registeredAddress.district}, {data.companyDetails.registeredAddress.state} - {data.companyDetails.registeredAddress.pinCode}
              </p>
            </div>
          </div>
        );

      case 'financial':
        return (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Annual Turnover</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">FY 2022-23:</span> <strong>{formatCurrency(data.financialDetails.annualTurnover.fy2022_23)}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">FY 2023-24:</span> <strong>{formatCurrency(data.financialDetails.annualTurnover.fy2023_24)}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">FY 2024-25:</span> <strong>{formatCurrency(data.financialDetails.annualTurnover.fy2024_25)}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">FY 2025-26:</span> <strong>{formatCurrency(data.financialDetails.annualTurnover.fy2025_26)}</strong></div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Employment (Latest FY)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Direct:</span> <strong>{data.financialDetails.employmentDetails.fy2025_26.direct || '—'}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Indirect:</span> <strong>{data.financialDetails.employmentDetails.fy2025_26.indirect || '—'}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total:</span> <strong>{data.financialDetails.employmentDetails.fy2025_26.total || '—'}</strong></div>
              </div>
            </div>
          </div>
        );

      case 'bank':
        return (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Bank Name:</span> <strong>{data.bankDetails.bankName || '—'}</strong></div>
            <div><span className="text-muted-foreground">Branch:</span> <strong>{data.bankDetails.branch || '—'}</strong></div>
            <div><span className="text-muted-foreground">Account Number:</span> <strong>{data.bankDetails.accountNumber || '—'}</strong></div>
            <div><span className="text-muted-foreground">IFSC Code:</span> <strong>{data.bankDetails.ifscCode || '—'}</strong></div>
            <div><span className="text-muted-foreground">SWIFT Code:</span> <strong>{data.bankDetails.swiftCode || '—'}</strong></div>
          </div>
        );

      case 'references':
        return (
          <div className="space-y-3">
            {data.vendorReferences.filter(ref => ref.companyName).map((ref, i) => (
              <div key={i} className="border border-border rounded-lg p-3 text-sm">
                <div className="font-medium text-base">{ref.companyName}</div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-muted-foreground">
                  <span>PO Date: {formatDate(ref.poDate)}</span>
                  <span>Status: {ref.currentStatus}</span>
                  <span>Value: {formatCurrency(ref.poValue)}</span>
                </div>
              </div>
            ))}
            {!data.vendorReferences.some(ref => ref.companyName) && (
              <p className="text-muted-foreground text-sm">No references added</p>
            )}
          </div>
        );

      case 'contacts':
        return (
          <div className="space-y-3">
            {data.contactPersons.filter(c => c.name).map((contact, i) => (
              <div key={i} className="border border-border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  {contact.isPrimary && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                  <span className="font-medium">{contact.name}</span>
                  <span className="text-muted-foreground">({contact.designation})</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {contact.contactNumber} • {contact.mailId}
                </div>
              </div>
            ))}
          </div>
        );

      case 'documents':
        return (
          <div className="grid grid-cols-2 gap-3">
            {data.documents.map((doc, i) => (
              <div key={i} className="flex items-center gap-2 text-sm border border-border rounded-lg p-3">
                <CheckCircle2 className={`w-5 h-5 ${doc.files.length > 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
                <div>
                  <span className={doc.files.length > 0 ? 'font-medium' : 'text-muted-foreground'}>{doc.docName}</span>
                  {doc.files.length > 0 && (
                    <span className="text-muted-foreground ml-2">({doc.files.length} file{doc.files.length > 1 ? 's' : ''})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case 'declaration':
        return (
          <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 border border-border rounded-lg">
              <Checkbox
                id="undertaking"
                checked={undertakingAccepted}
                onCheckedChange={(checked) => setUndertakingAccepted(!!checked)}
              />
              <label htmlFor="undertaking" className="text-sm leading-relaxed cursor-pointer">
                I hereby declare that all the information provided in this vendor registration form is true, accurate, and complete to the best of my knowledge and belief. I understand that any false or misleading information may result in the rejection of this application or termination of any subsequent business relationship. I authorize Premier Energies Limited to verify any information provided herein.
              </label>
            </div>

            <div className="flex items-start gap-3 p-4 border border-border rounded-lg">
              <Checkbox
                id="privacy"
                checked={privacyAccepted}
                onCheckedChange={(checked) => setPrivacyAccepted(!!checked)}
              />
              <label htmlFor="privacy" className="text-sm leading-relaxed cursor-pointer">
                I have read and accept the <a href="#" className="text-primary underline">Privacy Policy</a> and consent to the collection, processing, and storage of my company's data as described therein. I understand that my data will be used for vendor evaluation and management purposes.
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const CurrentIcon = STEPS[currentStep].icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[80vw] max-w-none h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5 text-primary" />
            Review Your Submission
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 px-6 py-3 bg-muted/30 border-b border-border">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : isCompleted 
                      ? 'bg-primary/20 text-primary' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <StepIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* Step content */}
        <div className="flex-1 px-6 py-6 overflow-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <CurrentIcon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">{STEPS[currentStep].label}</h3>
          </div>
          
          {renderStepContent()}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border flex justify-between">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handlePrevious}
              disabled={isFirstStep || submitting}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            
            {isLastStep ? (
              <Button 
                onClick={onSubmit} 
                disabled={!canSubmit || submitting}
                className="min-w-32"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Submit Form
                  </span>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
