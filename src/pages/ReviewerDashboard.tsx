import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getMyReviewerAssignments,
  getVendorForReviewer,
  getMyRatings,
  submitRatings,
} from "@/lib/db";
import {
  GradingSectionType,
  SECTION_LABELS,
  RATING_LABELS,
  getParametersForSection,
  computeSectionScore,
  GradingParameter,
  StoredFile,
} from "@/types/vendor";
import {
  Building2,
  LogOut,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Save,
  CheckCircle2,
  Clock,
  Star,
  TrendingUp,
  HardHat,
  ShoppingCart,
  FileText,
  MapPin,
  Banknote,
  Users,
  Briefcase,
  Eye,
} from "lucide-react";

const SECTION_ICONS: Record<GradingSectionType, React.ElementType> = {
  site: HardHat,
  procurement: ShoppingCart,
  financial: TrendingUp,
};

/* ========== File Preview Helper ========== */
const FilePreviewLink: React.FC<{ file: StoredFile }> = ({ file }) => {
  const handleOpen = () => {
    try {
      let dataUrl = file.data;
      if (!dataUrl.startsWith("data:")) {
        dataUrl = `data:${
          file.type || "application/octet-stream"
        };base64,${dataUrl}`;
      }
      const w = window.open();
      if (w) {
        if (file.type?.startsWith("image/")) {
          w.document.write(`<img src="${dataUrl}" style="max-width:100%;"/>`);
        } else if (file.type === "application/pdf") {
          w.document.write(
            `<iframe src="${dataUrl}" style="width:100%;height:100vh;border:none;"></iframe>`
          );
        } else {
          const a = w.document.createElement("a");
          a.href = dataUrl;
          a.download = file.name;
          a.click();
          w.close();
        }
      }
    } catch {
      /* silent */
    }
  };

  return (
    <button
      onClick={handleOpen}
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      <Eye className="w-3 h-3" />
      {file.name}
    </button>
  );
};

/* ========== Vendor Detail Sections (Read-Only) ========== */

const InfoRow: React.FC<{ label: string; value?: string | number | null }> = ({
  label,
  value,
}) => (
  <div className="flex items-start gap-2 py-1.5">
    <span className="text-xs text-muted-foreground w-36 shrink-0 font-medium">
      {label}
    </span>
    <span className="text-sm">{value || "—"}</span>
  </div>
);

const SectionCard: React.FC<{
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, children }) => (
  <div className="border border-border rounded-xl overflow-hidden">
    <div className="bg-muted/50 px-4 py-2.5 flex items-center gap-2 border-b border-border">
      <Icon className="w-4 h-4 text-primary" />
      <h4 className="text-sm font-semibold">{title}</h4>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const VendorDetailsView: React.FC<{ vendor: any }> = ({ vendor }) => {
  if (!vendor) {
    return (
      <div className="text-center py-8 text-muted-foreground animate-pulse">
        Loading vendor details...
      </div>
    );
  }

  const cd = vendor.companyDetails || {};
  const addr = cd.registeredAddress || {};
  const fd = vendor.financialDetails || {};
  const turnover = fd.annualTurnover || {};
  const emp = fd.employmentDetails || {};
  const bd = vendor.bankDetails || {};
  const refs = Array.isArray(vendor.vendorReferences)
    ? vendor.vendorReferences.filter(
        (r: any) => r && (r.companyName || "").trim()
      )
    : [];
  const contacts = Array.isArray(vendor.contactPersons)
    ? vendor.contactPersons.filter((c: any) => c && (c.name || "").trim())
    : [];
  const docs = Array.isArray(vendor.documents) ? vendor.documents : [];
  const goods = Array.isArray(cd.goodsAndServices)
    ? cd.goodsAndServices.filter((g: any) => (g.category || "").trim())
    : [];

  const formatCurrency = (val: number) => {
    if (!val) return "—";
    return `₹${val.toLocaleString("en-IN")}`;
  };

  return (
    <div className="space-y-4">
      {/* Company Details */}
      <SectionCard icon={Building2} title="Company Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <InfoRow label="Company Name" value={cd.companyName} />
          <InfoRow label="Managing Director" value={cd.managingDirectorName} />
          <InfoRow label="Organisation Type" value={cd.typeOfOrganisation} />
          <InfoRow
            label="Year of Establishment"
            value={cd.yearOfEstablishment}
          />
          <InfoRow label="CIN Number" value={cd.cinNumber} />
          <InfoRow label="GST Number" value={cd.gstNumber} />
          <InfoRow label="PAN Number" value={cd.panNumber} />
          <InfoRow label="Company Origin" value={cd.companyOrigin} />
          <InfoRow label="MSME Registered" value={cd.isMSME ? "Yes" : "No"} />
          {cd.companyWebsite && (
            <InfoRow label="Website" value={cd.companyWebsite} />
          )}
        </div>
        {goods.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <span className="text-xs font-medium text-muted-foreground">
              Goods & Services:
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {goods.map((g: any, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {g.category}
                  {g.otherDescription ? ` — ${g.otherDescription}` : ""}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Address */}
      <SectionCard icon={MapPin} title="Registered Address">
        <div className="text-sm">
          {[addr.line1, addr.line2].filter(Boolean).join(", ")}
          {addr.district || addr.state || addr.pinCode ? (
            <div className="mt-1 text-muted-foreground">
              {[addr.district, addr.state, addr.pinCode]
                .filter(Boolean)
                .join(", ")}
            </div>
          ) : (
            <span className="text-muted-foreground"> —</span>
          )}
        </div>
      </SectionCard>

      {/* Financial Details */}
      <SectionCard icon={TrendingUp} title="Financial Details">
        <div className="space-y-3">
          <div>
            <span className="text-xs font-medium text-muted-foreground">
              Annual Turnover
            </span>
            <div className="overflow-x-auto mt-1">
              <table className="w-full text-sm border border-border rounded">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-1.5 px-3 text-xs font-medium">
                      FY 2022-23
                    </th>
                    <th className="text-left py-1.5 px-3 text-xs font-medium">
                      FY 2023-24
                    </th>
                    <th className="text-left py-1.5 px-3 text-xs font-medium">
                      FY 2024-25
                    </th>
                    <th className="text-left py-1.5 px-3 text-xs font-medium">
                      FY 2025-26
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1.5 px-3">
                      {formatCurrency(turnover.fy2022_23)}
                    </td>
                    <td className="py-1.5 px-3">
                      {formatCurrency(turnover.fy2023_24)}
                    </td>
                    <td className="py-1.5 px-3">
                      {formatCurrency(turnover.fy2024_25)}
                    </td>
                    <td className="py-1.5 px-3">
                      {formatCurrency(turnover.fy2025_26)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-muted-foreground">
              Employment Details
            </span>
            <div className="overflow-x-auto mt-1">
              <table className="w-full text-sm border border-border rounded">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-1.5 px-3 text-xs font-medium">
                      Year
                    </th>
                    <th className="text-center py-1.5 px-3 text-xs font-medium">
                      Direct
                    </th>
                    <th className="text-center py-1.5 px-3 text-xs font-medium">
                      Indirect
                    </th>
                    <th className="text-center py-1.5 px-3 text-xs font-medium">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ["FY 2022-23", emp.fy2022_23],
                      ["FY 2023-24", emp.fy2023_24],
                      ["FY 2024-25", emp.fy2024_25],
                      ["FY 2025-26", emp.fy2025_26],
                    ] as [string, any][]
                  ).map(([label, data]) => (
                    <tr key={label} className="border-t border-border/50">
                      <td className="py-1.5 px-3 font-medium">{label}</td>
                      <td className="py-1.5 px-3 text-center">
                        {data?.direct || 0}
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        {data?.indirect || 0}
                      </td>
                      <td className="py-1.5 px-3 text-center font-medium">
                        {data?.total || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {Array.isArray(turnover.attachments) &&
            turnover.attachments.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Financial Report Attachments
                </span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {turnover.attachments.map((f: StoredFile, i: number) => (
                    <FilePreviewLink key={i} file={f} />
                  ))}
                </div>
              </div>
            )}
        </div>
      </SectionCard>

      {/* Bank Details */}
      <SectionCard icon={Banknote} title="Bank Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <InfoRow label="Bank Name" value={bd.bankName} />
          <InfoRow label="Branch" value={bd.branch} />
          <InfoRow label="Account Number" value={bd.accountNumber} />
          <InfoRow label="IFSC Code" value={bd.ifscCode} />
          {bd.swiftCode && <InfoRow label="SWIFT Code" value={bd.swiftCode} />}
        </div>
      </SectionCard>

      {/* Vendor References */}
      {refs.length > 0 && (
        <SectionCard
          icon={Briefcase}
          title={`Vendor References (${refs.length})`}
        >
          <div className="space-y-3">
            {refs.map((ref: any, i: number) => (
              <div
                key={i}
                className="bg-muted/30 rounded-lg p-3 border border-border/50"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{ref.companyName}</span>
                  {ref.currentStatus && (
                    <Badge variant="outline" className="text-xs">
                      {ref.currentStatus}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 text-xs text-muted-foreground">
                  {ref.poDate && <span>PO Date: {ref.poDate}</span>}
                  {ref.completionDate && (
                    <span>Completion: {ref.completionDate}</span>
                  )}
                  {ref.poValue > 0 && (
                    <span>
                      PO Value: ₹{Number(ref.poValue).toLocaleString("en-IN")}
                    </span>
                  )}
                  {ref.contactPersonName && (
                    <span>Contact: {ref.contactPersonName}</span>
                  )}
                  {ref.contactNumber && <span>Phone: {ref.contactNumber}</span>}
                  {ref.mailId && <span>Email: {ref.mailId}</span>}
                </div>
                {ref.remarks && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    {ref.remarks}
                  </p>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Contact Persons */}
      {contacts.length > 0 && (
        <SectionCard
          icon={Users}
          title={`Contact Persons (${contacts.length})`}
        >
          <div className="space-y-2">
            {contacts.map((c: any, i: number) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-muted/30 rounded-lg p-3 border border-border/50"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {(c.name || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {c.name}
                    </span>
                    {c.isPrimary && (
                      <Badge
                        className="text-[10px] px-1.5 py-0"
                        variant="default"
                      >
                        Primary
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                    {c.designation && <span>{c.designation}</span>}
                    {c.baseLocation && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" /> {c.baseLocation}
                      </span>
                    )}
                    {c.contactNumber && <span>Ph: {c.contactNumber}</span>}
                    {c.mailId && <span>{c.mailId}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Documents */}
      <SectionCard icon={FileText} title="Documents">
        <div className="space-y-2">
          {docs.map((doc: any, i: number) => {
            const hasFiles = Array.isArray(doc.files) && doc.files.length > 0;
            return (
              <div
                key={i}
                className={`flex items-center justify-between rounded-lg px-3 py-2 border ${
                  hasFiles
                    ? "bg-emerald-50/50 border-emerald-200/50"
                    : "bg-muted/30 border-border/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {hasFiles ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm">{doc.docName}</span>
                </div>
                {hasFiles && (
                  <div className="flex flex-wrap gap-2">
                    {doc.files.map((f: StoredFile, fi: number) => (
                      <FilePreviewLink key={fi} file={f} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
};

/* ========== Rating Form Component ========== */

const RatingForm: React.FC<{
  assignment: any;
  currentRatings: Record<string, number>;
  onUpdateRating: (paramKey: string, value: number) => void;
  onSubmit: () => void;
  saving: boolean;
}> = ({ assignment, currentRatings, onUpdateRating, onSubmit, saving }) => {
  const params = getParametersForSection(
    assignment.sectionType as GradingSectionType
  );
  const ratedCount = params.filter(
    (p) => currentRatings[p.key] && currentRatings[p.key] >= 1
  ).length;
  const sectionScore = computeSectionScore(
    assignment.sectionType as GradingSectionType,
    currentRatings
  );

  return (
    <div className="space-y-5">
      {/* Section score preview */}
      <div className="bg-card rounded-lg p-4 border border-border flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {SECTION_LABELS[assignment.sectionType as GradingSectionType]} Score
          </p>
          <p className="text-xs text-muted-foreground">
            {ratedCount} of {params.length} parameters rated
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-primary">
            {sectionScore.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">
            max {params.reduce((s, p) => s + p.weight, 0)}
          </p>
        </div>
      </div>

      {/* Rating Scale Legend (compact) */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
        <Star className="w-3.5 h-3.5 text-warning shrink-0" />
        {Object.entries(RATING_LABELS).map(([val, label]) => (
          <span key={val}>
            <strong className="text-foreground">{val}</strong>={label}
          </span>
        ))}
      </div>

      {/* Parameter ratings */}
      <div className="space-y-4">
        {params.map((param: GradingParameter) => {
          const rating = currentRatings[param.key] || 0;
          const paramScore =
            rating > 0 ? ((rating / 5) * param.weight).toFixed(2) : "—";

          return (
            <div
              key={param.key}
              className="bg-card rounded-lg p-4 border border-border space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                      {param.srNo}
                    </span>
                    <Label className="font-semibold">{param.name}</Label>
                    <Badge variant="outline" className="text-xs">
                      Weight: {param.weight}%
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {param.description}
                  </p>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <p className="text-lg font-bold">
                    {rating > 0 ? rating : "—"}
                    <span className="text-sm font-normal text-muted-foreground">
                      /5
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Score: {paramScore}
                  </p>
                </div>
              </div>

              {/* Rating selector buttons */}
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => onUpdateRating(param.key, val)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                      rating === val
                        ? "bg-primary text-primary-foreground border-primary shadow-md"
                        : "bg-card border-border hover:border-primary/50 hover:bg-muted"
                    }`}
                    title={RATING_LABELS[val]}
                  >
                    {val}
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {RATING_LABELS[rating]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="text-sm text-muted-foreground">
          {ratedCount === params.length ? (
            <span className="text-success flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              All parameters rated
            </span>
          ) : (
            <span>{params.length - ratedCount} parameter(s) remaining</span>
          )}
        </div>
        <Button
          onClick={onSubmit}
          disabled={saving || ratedCount < params.length}
          size="lg"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving
            ? "Submitting..."
            : assignment.ratingsSubmitted
            ? "Update Ratings"
            : "Submit Ratings"}
        </Button>
      </div>
    </div>
  );
};

/* ========== Main Dashboard ========== */

const ReviewerDashboard: React.FC = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [vendorData, setVendorData] = useState<Record<string, any>>({});
  const [ratingsState, setRatingsState] = useState<
    Record<string, Record<string, number>>
  >({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("rating");

  const { user, logout, isReviewer } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.verified || !isReviewer) {
      navigate("/");
      return;
    }
    loadAssignments();
  }, [user, isReviewer]);

  const loadAssignments = async () => {
    try {
      const data = await getMyReviewerAssignments();
      setAssignments(data);
    } catch (e: any) {
      toast({
        title: "Failed to load assignments",
        description: String(e?.message || e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const compositeKey = (vendorId: string, section: string) =>
    `${vendorId}__${section}`;

  const handleExpand = async (
    vendorId: string,
    sectionType: GradingSectionType
  ) => {
    const key = compositeKey(vendorId, sectionType);
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(key);
    setActiveTab("rating");

    // Load vendor data (keyed by vendorId so multiple sections share it)
    if (!vendorData[vendorId]) {
      try {
        const { vendor } = await getVendorForReviewer(vendorId);
        setVendorData((prev) => ({ ...prev, [vendorId]: vendor }));
      } catch {}
    }
    // Load ratings (keyed by vendorId+section)
    if (!ratingsState[key]) {
      try {
        const existing = await getMyRatings(vendorId, sectionType);
        setRatingsState((prev) => ({ ...prev, [key]: existing || {} }));
      } catch {
        setRatingsState((prev) => ({ ...prev, [key]: {} }));
      }
    }
  };

  const updateRating = (key: string, paramKey: string, value: number) => {
    setRatingsState((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [paramKey]: value },
    }));
  };

  const handleSubmit = async (
    vendorId: string,
    sectionType: GradingSectionType
  ) => {
    const key = compositeKey(vendorId, sectionType);
    const ratings = ratingsState[key] || {};
    const params = getParametersForSection(sectionType);

    const missing = params.filter((p) => !ratings[p.key] || ratings[p.key] < 1);
    if (missing.length > 0) {
      toast({
        title: "Incomplete Ratings",
        description: `Please rate all ${params.length} parameters before submitting.`,
        variant: "destructive",
      });
      return;
    }

    setSaving(key);
    try {
      await submitRatings(vendorId, sectionType, ratings);
      toast({
        title: "Ratings Submitted",
        description: `${SECTION_LABELS[sectionType]} ratings saved successfully.`,
      });
      await loadAssignments();
    } catch (e: any) {
      toast({
        title: "Failed to submit",
        description: String(e?.message || e),
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const stats = {
    total: assignments.length,
    submitted: assignments.filter((a) => a.ratingsSubmitted).length,
    pending: assignments.filter((a) => !a.ratingsSubmitted).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">Reviewer Dashboard</h1>
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
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Assignments</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-2xl font-bold text-warning">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-2xl font-bold text-success">{stats.submitted}</p>
            <p className="text-sm text-muted-foreground">Submitted</p>
          </div>
        </div>

        {/* Assignments */}
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="bg-card rounded-xl p-12 text-center border border-border">
              <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Assignments</h3>
              <p className="text-muted-foreground">
                You have not been assigned to review any vendors yet.
              </p>
            </div>
          ) : (
            assignments.map((assignment) => {
              const key = compositeKey(
                assignment.vendorId,
                assignment.sectionType
              );
              const isExpanded = expandedKey === key;
              const SectionIcon =
                SECTION_ICONS[assignment.sectionType as GradingSectionType] ||
                Building2;
              const params = getParametersForSection(
                assignment.sectionType as GradingSectionType
              );
              const currentRatings = ratingsState[key] || {};
              const ratedCount = params.filter(
                (p) => currentRatings[p.key] && currentRatings[p.key] >= 1
              ).length;

              return (
                <div
                  key={key}
                  className="bg-card rounded-xl border border-border overflow-hidden"
                >
                  {/* Assignment Header */}
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() =>
                      handleExpand(
                        assignment.vendorId,
                        assignment.sectionType as GradingSectionType
                      )
                    }
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <SectionIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {assignment.vendor?.companyName || "Unnamed Vendor"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {
                            SECTION_LABELS[
                              assignment.sectionType as GradingSectionType
                            ]
                          }
                          {ratedCount > 0 && !assignment.ratingsSubmitted && (
                            <span className="ml-2 text-xs text-warning">
                              ({ratedCount}/{params.length} rated)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {assignment.ratingsSubmitted ? (
                        <Badge
                          variant="default"
                          className="bg-success hover:bg-success/90"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Submitted
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>

                  {/* Expanded: Tabbed View with Vendor Details + Rating */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      <Tabs
                        value={activeTab}
                        onValueChange={setActiveTab}
                        className="w-full"
                      >
                        <div className="px-4 pt-3 bg-muted/20 border-b border-border">
                          <TabsList className="h-9">
                            <TabsTrigger value="rating" className="text-sm">
                              <Star className="w-3.5 h-3.5 mr-1.5" />
                              Rate Performance
                            </TabsTrigger>
                            <TabsTrigger value="details" className="text-sm">
                              <Building2 className="w-3.5 h-3.5 mr-1.5" />
                              Vendor Details
                            </TabsTrigger>
                          </TabsList>
                        </div>

                        <TabsContent value="rating" className="p-6 mt-0">
                          <RatingForm
                            assignment={assignment}
                            currentRatings={currentRatings}
                            onUpdateRating={(paramKey, value) =>
                              updateRating(key, paramKey, value)
                            }
                            onSubmit={() =>
                              handleSubmit(
                                assignment.vendorId,
                                assignment.sectionType as GradingSectionType
                              )
                            }
                            saving={saving === key}
                          />
                        </TabsContent>

                        <TabsContent value="details" className="p-6 mt-0">
                          <VendorDetailsView
                            vendor={vendorData[assignment.vendorId]}
                          />
                        </TabsContent>
                      </Tabs>
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

export default ReviewerDashboard;
