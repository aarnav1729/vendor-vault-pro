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
import { ScrollArea } from '@/components/ui/scroll-area';
import { VendorFormData } from '@/types/vendor';
import { 
  Building2, TrendingUp, Landmark, FileCheck, Users, FolderOpen,
  CheckCircle2, FileText, Star
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  data: VendorFormData;
  submitting: boolean;
}

export const FormPreviewModal: React.FC<Props> = ({ 
  open, 
  onClose, 
  onSubmit, 
  data,
  submitting 
}) => {
  const [undertakingAccepted, setUndertakingAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const canSubmit = undertakingAccepted && privacyAccepted;

  const formatCurrency = (value: number) => {
    if (!value) return '—';
    return '₹' + new Intl.NumberFormat('en-IN').format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5 text-primary" />
            Review Your Submission
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 pb-4">
            {/* Company Details */}
            <section className="border border-border rounded-lg p-4">
              <h3 className="flex items-center gap-2 font-semibold text-lg mb-4">
                <Building2 className="w-5 h-5 text-primary" />
                Company Details
              </h3>
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
              <div className="mt-3 text-sm">
                <span className="text-muted-foreground">Address:</span>
                <p className="font-medium mt-1">
                  {data.companyDetails.registeredAddress.line1}
                  {data.companyDetails.registeredAddress.line2 && `, ${data.companyDetails.registeredAddress.line2}`}
                  <br />
                  {data.companyDetails.registeredAddress.district}, {data.companyDetails.registeredAddress.state} - {data.companyDetails.registeredAddress.pinCode}
                </p>
              </div>
            </section>

            {/* Financial Details */}
            <section className="border border-border rounded-lg p-4">
              <h3 className="flex items-center gap-2 font-semibold text-lg mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                Financial Details
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Annual Turnover</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">FY 2022-23:</span> <strong>{formatCurrency(data.financialDetails.annualTurnover.fy2022_23)}</strong></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">FY 2023-24:</span> <strong>{formatCurrency(data.financialDetails.annualTurnover.fy2023_24)}</strong></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">FY 2024-25:</span> <strong>{formatCurrency(data.financialDetails.annualTurnover.fy2024_25)}</strong></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">FY 2025-26:</span> <strong>{formatCurrency(data.financialDetails.annualTurnover.fy2025_26)}</strong></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Employment (Latest FY)</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Direct:</span> <strong>{data.financialDetails.employmentDetails.fy2025_26.direct || '—'}</strong></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Indirect:</span> <strong>{data.financialDetails.employmentDetails.fy2025_26.indirect || '—'}</strong></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Total:</span> <strong>{data.financialDetails.employmentDetails.fy2025_26.total || '—'}</strong></div>
                  </div>
                </div>
              </div>
            </section>

            {/* Bank Details */}
            <section className="border border-border rounded-lg p-4">
              <h3 className="flex items-center gap-2 font-semibold text-lg mb-4">
                <Landmark className="w-5 h-5 text-primary" />
                Bank Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Bank Name:</span> <strong>{data.bankDetails.bankName || '—'}</strong></div>
                <div><span className="text-muted-foreground">Branch:</span> <strong>{data.bankDetails.branch || '—'}</strong></div>
                <div><span className="text-muted-foreground">Account Number:</span> <strong>{data.bankDetails.accountNumber || '—'}</strong></div>
                <div><span className="text-muted-foreground">IFSC Code:</span> <strong>{data.bankDetails.ifscCode || '—'}</strong></div>
                <div><span className="text-muted-foreground">SWIFT Code:</span> <strong>{data.bankDetails.swiftCode || '—'}</strong></div>
              </div>
            </section>

            {/* References */}
            <section className="border border-border rounded-lg p-4">
              <h3 className="flex items-center gap-2 font-semibold text-lg mb-4">
                <FileCheck className="w-5 h-5 text-primary" />
                Vendor References
              </h3>
              <div className="space-y-3">
                {data.vendorReferences.filter(ref => ref.companyName).map((ref, i) => (
                  <div key={i} className="border-b border-border pb-3 last:border-0 text-sm">
                    <div className="font-medium">{ref.companyName}</div>
                    <div className="grid grid-cols-3 gap-2 mt-1 text-muted-foreground">
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
            </section>

            {/* Contact Persons */}
            <section className="border border-border rounded-lg p-4">
              <h3 className="flex items-center gap-2 font-semibold text-lg mb-4">
                <Users className="w-5 h-5 text-primary" />
                Contact Persons
              </h3>
              <div className="space-y-2">
                {data.contactPersons.filter(c => c.name).map((contact, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    {contact.isPrimary && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                    <span className="font-medium">{contact.name}</span>
                    <span className="text-muted-foreground">({contact.designation})</span>
                    <span className="text-muted-foreground">• {contact.contactNumber}</span>
                    <span className="text-muted-foreground">• {contact.mailId}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Documents */}
            <section className="border border-border rounded-lg p-4">
              <h3 className="flex items-center gap-2 font-semibold text-lg mb-4">
                <FolderOpen className="w-5 h-5 text-primary" />
                Uploaded Documents
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {data.documents.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className={`w-4 h-4 ${doc.files.length > 0 ? 'text-success' : 'text-muted-foreground'}`} />
                    <span className={doc.files.length > 0 ? '' : 'text-muted-foreground'}>{doc.docName}</span>
                    {doc.files.length > 0 && (
                      <span className="text-muted-foreground">({doc.files.length} file{doc.files.length > 1 ? 's' : ''})</span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Undertaking */}
            <section className="border border-primary/30 rounded-lg p-4 bg-primary/5">
              <h3 className="font-semibold text-lg mb-4">Declaration & Undertaking</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="undertaking"
                    checked={undertakingAccepted}
                    onCheckedChange={(checked) => setUndertakingAccepted(!!checked)}
                  />
                  <label htmlFor="undertaking" className="text-sm leading-relaxed cursor-pointer">
                    I hereby declare that all the information provided in this vendor registration form is true, accurate, and complete to the best of my knowledge and belief. I understand that any false or misleading information may result in the rejection of this application or termination of any subsequent business relationship. I authorize Premier Energies Limited to verify any information provided herein.
                  </label>
                </div>

                <div className="flex items-start gap-3">
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
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t border-border pt-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Go Back & Edit
          </Button>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
