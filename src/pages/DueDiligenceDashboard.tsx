import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getAllVendors, getAllClassifications, getDueDiligenceVerifications, saveDueDiligenceVerification } from '@/lib/db';
import { VendorFormData, VendorClassification, DueDiligenceVerification, FieldVerification } from '@/types/vendor';
import { 
  Building2, LogOut, CheckCircle2, XCircle, Clock, 
  ChevronDown, ChevronUp, MessageSquare, Shield
} from 'lucide-react';

const DueDiligenceDashboard: React.FC = () => {
  const [vendors, setVendors] = useState<VendorFormData[]>([]);
  const [classifications, setClassifications] = useState<Map<string, VendorClassification>>(new Map());
  const [verifications, setVerifications] = useState<Map<string, DueDiligenceVerification>>(new Map());
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.verified) {
      navigate('/');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    const [vendorList, classificationList, verificationList] = await Promise.all([
      getAllVendors(),
      getAllClassifications(),
      getDueDiligenceVerifications(),
    ]);
    
    // Filter only vendors sent for due diligence
    const classMap = new Map<string, VendorClassification>();
    classificationList.forEach(c => classMap.set(c.vendorId, c));
    
    const dueDiligenceVendors = vendorList.filter(v => 
      classMap.get(v.id!)?.dueDiligenceSent
    );
    
    setVendors(dueDiligenceVendors);
    setClassifications(classMap);
    
    const verMap = new Map<string, DueDiligenceVerification>();
    verificationList.forEach(v => verMap.set(v.vendorId, v));
    setVerifications(verMap);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getOrCreateVerification = (vendorId: string): DueDiligenceVerification => {
    const existing = verifications.get(vendorId);
    if (existing) return existing;
    
    return {
      vendorId,
      companyDetails: { verified: false },
      financialDetails: { verified: false },
      bankDetails: { verified: false },
      references: { verified: false },
      documents: { verified: false },
      overallStatus: 'pending',
      assignedAt: classifications.get(vendorId)?.dueDiligenceDate || new Date().toISOString(),
    };
  };

  const handleFieldVerification = async (
    vendorId: string, 
    field: keyof Pick<DueDiligenceVerification, 'companyDetails' | 'financialDetails' | 'bankDetails' | 'references' | 'documents'>,
    verified: boolean,
    comment?: string
  ) => {
    const verification = getOrCreateVerification(vendorId);
    verification[field] = {
      verified,
      comment,
      verifiedBy: user?.email,
      verifiedAt: new Date().toISOString(),
    };
    
    // Update overall status
    const fields = ['companyDetails', 'financialDetails', 'bankDetails', 'references', 'documents'] as const;
    const allVerified = fields.every(f => verification[f].verified);
    const anyRejected = fields.some(f => verification[f].verified === false && verification[f].comment);
    
    if (allVerified) {
      verification.overallStatus = 'verified';
      verification.completedAt = new Date().toISOString();
    } else if (anyRejected) {
      verification.overallStatus = 'rejected';
    } else {
      verification.overallStatus = 'in_progress';
    }
    
    await saveDueDiligenceVerification(verification);
    setVerifications(new Map(verifications.set(vendorId, verification)));
    
    toast({
      title: verified ? 'Field Verified' : 'Comment Added',
      description: `${field.replace(/([A-Z])/g, ' $1').trim()} has been ${verified ? 'verified' : 'marked with comment'}.`,
    });
  };

  const FieldVerificationRow: React.FC<{
    vendorId: string;
    field: keyof Pick<DueDiligenceVerification, 'companyDetails' | 'financialDetails' | 'bankDetails' | 'references' | 'documents'>;
    label: string;
    verification: FieldVerification;
  }> = ({ vendorId, field, label, verification }) => {
    const [comment, setComment] = useState(verification.comment || '');
    const [showComment, setShowComment] = useState(false);

    return (
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">{label}</span>
          <div className="flex items-center gap-2">
            {verification.verified ? (
              <Badge variant="default" className="bg-success">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            ) : verification.comment ? (
              <Badge variant="destructive">
                <XCircle className="w-3 h-3 mr-1" />
                Issue Found
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                Pending
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant={verification.verified ? "default" : "outline"}
            onClick={() => handleFieldVerification(vendorId, field, true)}
            className={verification.verified ? "bg-success hover:bg-success/90" : ""}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Verify
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowComment(!showComment)}
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            {verification.comment ? 'Edit Comment' : 'Add Comment'}
          </Button>
        </div>
        
        {showComment && (
          <div className="space-y-2">
            <Textarea
              placeholder="Add comment if there's an issue..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                handleFieldVerification(vendorId, field, false, comment);
                setShowComment(false);
              }}
              disabled={!comment}
            >
              Submit Issue
            </Button>
          </div>
        )}
        
        {verification.comment && !showComment && (
          <div className="bg-destructive/10 rounded p-2 text-sm">
            <span className="font-medium text-destructive">Issue: </span>
            {verification.comment}
          </div>
        )}
      </div>
    );
  };

  const stats = {
    total: vendors.length,
    pending: vendors.filter(v => !verifications.get(v.id!) || verifications.get(v.id!)?.overallStatus === 'pending').length,
    inProgress: vendors.filter(v => verifications.get(v.id!)?.overallStatus === 'in_progress').length,
    verified: vendors.filter(v => verifications.get(v.id!)?.overallStatus === 'verified').length,
    rejected: vendors.filter(v => verifications.get(v.id!)?.overallStatus === 'rejected').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info flex items-center justify-center">
                <Shield className="w-6 h-6 text-info-foreground" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">Due Diligence Portal</h1>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Assigned</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-2xl font-bold text-warning">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-2xl font-bold text-info">{stats.inProgress}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-2xl font-bold text-success">{stats.verified}</p>
            <p className="text-sm text-muted-foreground">Verified</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-2xl font-bold text-destructive">{stats.rejected}</p>
            <p className="text-sm text-muted-foreground">Issues Found</p>
          </div>
        </div>

        {/* Vendors List */}
        <div className="space-y-4">
          {vendors.length === 0 ? (
            <div className="bg-card rounded-xl p-12 text-center border border-border">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Vendors Assigned</h3>
              <p className="text-muted-foreground">Vendors sent for due diligence will appear here.</p>
            </div>
          ) : (
            vendors.map((vendor) => {
              const verification = getOrCreateVerification(vendor.id!);
              const isExpanded = expandedVendor === vendor.id;
              
              return (
                <div key={vendor.id} className="bg-card rounded-xl border border-border overflow-hidden">
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedVendor(isExpanded ? null : vendor.id!)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{vendor.companyDetails.companyName || 'Unnamed Vendor'}</p>
                        <p className="text-sm text-muted-foreground">{vendor.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={
                        verification.overallStatus === 'verified' ? 'default' :
                        verification.overallStatus === 'rejected' ? 'destructive' :
                        verification.overallStatus === 'in_progress' ? 'secondary' : 'outline'
                      }>
                        {verification.overallStatus.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="border-t border-border p-4 space-y-4 bg-muted/30">
                      <FieldVerificationRow
                        vendorId={vendor.id!}
                        field="companyDetails"
                        label="Company Details"
                        verification={verification.companyDetails}
                      />
                      <FieldVerificationRow
                        vendorId={vendor.id!}
                        field="financialDetails"
                        label="Financial Details"
                        verification={verification.financialDetails}
                      />
                      <FieldVerificationRow
                        vendorId={vendor.id!}
                        field="bankDetails"
                        label="Bank Details"
                        verification={verification.bankDetails}
                      />
                      <FieldVerificationRow
                        vendorId={vendor.id!}
                        field="references"
                        label="References"
                        verification={verification.references}
                      />
                      <FieldVerificationRow
                        vendorId={vendor.id!}
                        field="documents"
                        label="Documents"
                        verification={verification.documents}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default DueDiligenceDashboard;
