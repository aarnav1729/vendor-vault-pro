import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  VendorFormData, 
  VendorClassification, 
  ScoringMatrix,
  VendorType,
  OpexSubType,
  CapexSubType,
  CapexBand,
  CAPEX_BANDS
} from '@/types/vendor';
import { 
  Building2, TrendingUp, Landmark, FileCheck, Users, FolderOpen,
  Save, Mail, FileText, Eye
} from 'lucide-react';

interface Props {
  vendor: VendorFormData;
  classification?: VendorClassification;
  scoringMatrix: ScoringMatrix | null;
  onClose: () => void;
  onSaveClassification: (classification: VendorClassification) => Promise<void>;
}

const OPEX_SUBTYPES = [
  { value: 'raw_material', label: 'Raw Material' },
  { value: 'consumables', label: 'Consumables' },
  { value: 'service', label: 'Service' },
];

const CAPEX_SUBTYPES = [
  { value: 'civil', label: 'Civil Vendors' },
  { value: 'plant_machinery', label: 'Plant & Machinery' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'service', label: 'Service' },
];

export const VendorDetailModal: React.FC<Props> = ({
  vendor,
  classification: initialClassification,
  scoringMatrix,
  onClose,
  onSaveClassification,
}) => {
  const [localClassification, setLocalClassification] = useState<VendorClassification>(() => ({
    vendorId: vendor.id!,
    vendorType: initialClassification?.vendorType || null,
    opexSubType: initialClassification?.opexSubType || null,
    capexSubType: initialClassification?.capexSubType || null,
    capexBand: initialClassification?.capexBand || null,
    scores: initialClassification?.scores || {
      companyDetails: 0,
      financialDetails: 0,
      bankDetails: 0,
      references: 0,
      documents: 0,
    },
    totalScore: initialClassification?.totalScore || 0,
    notes: initialClassification?.notes || '',
    dueDiligenceSent: initialClassification?.dueDiligenceSent || false,
    infoRequestSent: initialClassification?.infoRequestSent || false,
  }));

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    calculateTotalScore();
  }, [localClassification.scores, scoringMatrix]);

  const calculateTotalScore = () => {
    if (!scoringMatrix) return;
    
    const { scores } = localClassification;
    const total = 
      (scores.companyDetails * scoringMatrix.companyDetailsWeight +
       scores.financialDetails * scoringMatrix.financialDetailsWeight +
       scores.bankDetails * scoringMatrix.bankDetailsWeight +
       scores.references * scoringMatrix.referencesWeight +
       scores.documents * scoringMatrix.documentsWeight) / 100;
    
    setLocalClassification(prev => ({ ...prev, totalScore: Math.round(total * 10) / 10 }));
  };

  const updateScore = (category: keyof typeof localClassification.scores, value: number) => {
    setLocalClassification(prev => ({
      ...prev,
      scores: { ...prev.scores, [category]: value }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSaveClassification(localClassification);
    setSaving(false);
    onClose();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {vendor.companyDetails.companyName || 'Unnamed Vendor'}
              </h2>
              <p className="text-sm text-muted-foreground font-normal">{vendor.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="p-6">
            <Tabs defaultValue="details">
              <TabsList className="mb-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="classification">Classification</TabsTrigger>
                <TabsTrigger value="scoring">Scoring</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-6">
                {/* Company Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      Company Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CIN:</span>
                        <span>{vendor.companyDetails.cinNumber || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">GST:</span>
                        <span>{vendor.companyDetails.gstNumber || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">PAN:</span>
                        <span>{vendor.companyDetails.panNumber || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Established:</span>
                        <span>{vendor.companyDetails.yearOfEstablishment || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Origin:</span>
                        <span>{vendor.companyDetails.companyOrigin || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">MSME:</span>
                        <span>{vendor.companyDetails.isMSME ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Financial Summary
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">FY 2022-23:</span>
                        <span>{formatCurrency(vendor.financialDetails.annualTurnover.fy2022_23)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">FY 2023-24:</span>
                        <span>{formatCurrency(vendor.financialDetails.annualTurnover.fy2023_24)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">FY 2024-25:</span>
                        <span>{formatCurrency(vendor.financialDetails.annualTurnover.fy2024_25)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">FY 2025-26:</span>
                        <span>{formatCurrency(vendor.financialDetails.annualTurnover.fy2025_26)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-primary" />
                    Bank Details
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block">Bank:</span>
                      <span>{vendor.bankDetails.bankName || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Branch:</span>
                      <span>{vendor.bankDetails.branch || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Account:</span>
                      <span>{vendor.bankDetails.accountNumber || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">IFSC:</span>
                      <span>{vendor.bankDetails.ifscCode || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* References */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-primary" />
                    References ({vendor.vendorReferences.filter(r => r.companyName).length})
                  </h3>
                  <div className="space-y-2">
                    {vendor.vendorReferences.filter(r => r.companyName).map((ref, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{ref.companyName}</p>
                          <p className="text-sm text-muted-foreground">
                            {ref.contactPersonName} • {ref.currentStatus}
                          </p>
                        </div>
                        <span className="text-sm">{formatCurrency(ref.poValue)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contacts */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Contact Persons ({vendor.contactPersons.filter(c => c.name).length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {vendor.contactPersons.filter(c => c.name).map((contact, i) => (
                      <div key={i} className="p-3 bg-muted/50 rounded-lg">
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground">{contact.designation}</p>
                        <p className="text-sm">{contact.mailId}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Classification Tab */}
              <TabsContent value="classification" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Vendor Type</Label>
                      <Select 
                        value={localClassification.vendorType || ''} 
                        onValueChange={(v) => setLocalClassification(prev => ({
                          ...prev,
                          vendorType: v as VendorType,
                          opexSubType: null,
                          capexSubType: null,
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="capex">Capex</SelectItem>
                          <SelectItem value="opex">Opex</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {localClassification.vendorType === 'opex' && (
                      <div className="space-y-2">
                        <Label>Opex Sub-Type</Label>
                        <Select 
                          value={localClassification.opexSubType || ''} 
                          onValueChange={(v) => setLocalClassification(prev => ({
                            ...prev,
                            opexSubType: v as OpexSubType
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select sub-type" />
                          </SelectTrigger>
                          <SelectContent>
                            {OPEX_SUBTYPES.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {localClassification.vendorType === 'capex' && (
                      <div className="space-y-2">
                        <Label>Capex Sub-Type</Label>
                        <Select 
                          value={localClassification.capexSubType || ''} 
                          onValueChange={(v) => setLocalClassification(prev => ({
                            ...prev,
                            capexSubType: v as CapexSubType
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select sub-type" />
                          </SelectTrigger>
                          <SelectContent>
                            {CAPEX_SUBTYPES.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Capex Band</Label>
                      <Select 
                        value={localClassification.capexBand || ''} 
                        onValueChange={(v) => setLocalClassification(prev => ({
                          ...prev,
                          capexBand: v as CapexBand
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select band" />
                        </SelectTrigger>
                        <SelectContent>
                          {CAPEX_BANDS.map(b => (
                            <SelectItem key={b.value!} value={b.value!}>{b.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={localClassification.notes || ''}
                        onChange={(e) => setLocalClassification(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Add classification notes..."
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Scoring Tab */}
              <TabsContent value="scoring" className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total Score</span>
                    <span className="text-3xl font-bold text-primary">{localClassification.totalScore}</span>
                  </div>
                </div>

                <div className="space-y-6">
                  {[
                    { key: 'companyDetails', label: 'Company Details', weight: scoringMatrix?.companyDetailsWeight },
                    { key: 'financialDetails', label: 'Financial Details', weight: scoringMatrix?.financialDetailsWeight },
                    { key: 'bankDetails', label: 'Bank Details', weight: scoringMatrix?.bankDetailsWeight },
                    { key: 'references', label: 'References', weight: scoringMatrix?.referencesWeight },
                    { key: 'documents', label: 'Documents', weight: scoringMatrix?.documentsWeight },
                  ].map(({ key, label, weight }) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{label} (Weight: {weight}%)</Label>
                        <span className="font-medium">
                          {localClassification.scores[key as keyof typeof localClassification.scores]}/10
                        </span>
                      </div>
                      <Slider
                        value={[localClassification.scores[key as keyof typeof localClassification.scores]]}
                        onValueChange={([v]) => updateScore(key as keyof typeof localClassification.scores, v)}
                        max={10}
                        step={0.5}
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-4">
                {vendor.documents.map((doc, i) => (
                  <div 
                    key={i} 
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      doc.attached ? 'bg-success/10' : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className={`w-4 h-4 ${doc.attached ? 'text-success' : 'text-muted-foreground'}`} />
                      <span>{doc.docName}</span>
                    </div>
                    {doc.attached && doc.files.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{doc.files.length} file(s)</Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-border">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Classification'}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
