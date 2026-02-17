import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  VendorFormData,
  VendorClassification,
  VendorType,
  CapexBand,
  CAPEX_BANDS,
  GradingSectionType,
  SECTION_LABELS,
  SECTION_RESPONSIBILITY,
  RATING_LABELS,
  getParametersForSection,
  GradingParameter,
  GradeCategory,
  GRADE_THRESHOLDS,
  ReviewerAssignment,
  VendorRating,
  VendorGrade,
  getGradeForScore,
} from "@/types/vendor";
import {
  getVendorById,
  getClassification,
  saveClassification,
  getReviewerAssignments,
  assignReviewer,
  removeReviewerAssignment,
  getVendorAllRatings,
  getVendorGrade,
  computeVendorGrade,
  overrideVendorGrade,
} from "@/lib/db";
import {
  Building2,
  UserPlus,
  Trash2,
  ClipboardCheck,
  RefreshCw,
  Shield,
  HardHat,
  ShoppingCart,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Star,
} from "lucide-react";

interface VendorDetailModalProps {
  vendorId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

const GRADE_COLORS: Record<string, { text: string; bg: string }> = {
  A: { text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  B: { text: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  C: { text: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  D: { text: "text-red-700", bg: "bg-red-50 border-red-200" },
};

const SECTION_ICONS: Record<GradingSectionType, React.ElementType> = {
  site: HardHat,
  procurement: ShoppingCart,
  financial: TrendingUp,
};

const VendorDetailModal: React.FC<VendorDetailModalProps> = ({
  vendorId,
  open,
  onOpenChange,
  onUpdate,
}) => {
  const [vendor, setVendor] = useState<VendorFormData | null>(null);
  const [classification, setClassification] =
    useState<VendorClassification | null>(null);
  const [assignments, setAssignments] = useState<ReviewerAssignment[]>([]);
  const [ratings, setRatings] = useState<VendorRating[]>([]);
  const [grade, setGrade] = useState<VendorGrade | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // Reviewer assignment form states
  const [newReviewerEmails, setNewReviewerEmails] = useState<
    Record<GradingSectionType, string>
  >({ site: "", procurement: "", financial: "" });
  const [assigning, setAssigning] = useState<string | null>(null);

  // Override grade
  const [overrideGrade, setOverrideGrade] = useState<string>("none");
  const [overriding, setOverriding] = useState(false);

  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    try {
      const [v, cl, asn, rat, gr] = await Promise.all([
        getVendorById(vendorId).catch(() => null),
        getClassification(vendorId).catch(() => null),
        getReviewerAssignments(vendorId).catch(() => []),
        getVendorAllRatings(vendorId).catch(() => []),
        getVendorGrade(vendorId).catch(() => null),
      ]);
      setVendor(v || null);
      setClassification(cl || null);
      setAssignments(asn || []);
      setRatings(rat || []);
      setGrade(gr || null);
      setOverrideGrade(gr?.adminOverrideGrade || "none");
    } catch (e) {
      console.error("Failed to load vendor detail data:", e);
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    if (open && vendorId) {
      loadData();
      setActiveTab("details");
    }
  }, [open, vendorId, loadData]);

  const handleAssignReviewer = async (section: GradingSectionType) => {
    const email = newReviewerEmails[section]?.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast({ title: "Invalid email", variant: "destructive" });
      return;
    }
    if (!vendorId) return;

    setAssigning(section);
    try {
      await assignReviewer(vendorId, section, email);
      toast({
        title: "Reviewer assigned",
        description: `${email} → ${SECTION_LABELS[section]}`,
      });
      setNewReviewerEmails((prev) => ({ ...prev, [section]: "" }));
      await loadData();
    } catch (e: any) {
      toast({
        title: "Assignment failed",
        description: String(e?.message || e),
        variant: "destructive",
      });
    } finally {
      setAssigning(null);
    }
  };

  const handleRemoveAssignment = async (assignmentId: number) => {
    try {
      await removeReviewerAssignment(assignmentId);
      toast({ title: "Assignment removed" });
      await loadData();
    } catch (e: any) {
      toast({
        title: "Remove failed",
        description: String(e?.message || e),
        variant: "destructive",
      });
    }
  };

  const handleComputeGrade = async () => {
    if (!vendorId) return;
    try {
      await computeVendorGrade(vendorId);
      toast({ title: "Grade recomputed" });
      await loadData();
      onUpdate?.();
    } catch (e: any) {
      toast({
        title: "Compute failed",
        description: String(e?.message || e),
        variant: "destructive",
      });
    }
  };

  const handleOverrideGrade = async () => {
    if (!vendorId) return;
    setOverriding(true);
    try {
      const g =
        overrideGrade === "none" ? null : (overrideGrade as GradeCategory);
      await overrideVendorGrade(vendorId, g);
      toast({ title: g ? `Grade overridden to ${g}` : "Override removed" });
      await loadData();
      onUpdate?.();
    } catch (e: any) {
      toast({
        title: "Override failed",
        description: String(e?.message || e),
        variant: "destructive",
      });
    } finally {
      setOverriding(false);
    }
  };

  // Helper: get ratings for a section as Record<paramKey, number>
  const ratingsForSection = (
    section: GradingSectionType
  ): Record<string, { rating: number; ratedBy: string }> => {
    const result: Record<string, { rating: number; ratedBy: string }> = {};
    ratings
      .filter((r) => r.sectionType === section)
      .forEach((r) => {
        result[r.parameterKey] = { rating: r.rating, ratedBy: r.ratedBy };
      });
    return result;
  };

  const assignmentsForSection = (section: GradingSectionType) =>
    assignments.filter((a) => a.sectionType === section);

  const companyName = vendor?.companyDetails?.companyName || "Unnamed Vendor";

  if (!vendorId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {loading ? "Loading..." : companyName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground animate-pulse">
            Loading vendor data...
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="reviewers">Reviewers</TabsTrigger>
              <TabsTrigger value="ratings">Ratings</TabsTrigger>
              <TabsTrigger value="grade">Grade</TabsTrigger>
            </TabsList>

            {/* ===== DETAILS TAB ===== */}
            <TabsContent value="details" className="space-y-4 mt-4">
              {vendor && (
                <>
                  {/* Company Details */}
                  <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <h3 className="font-semibold text-sm">Company Details</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Email:</span>{" "}
                        {vendor.email}
                      </div>
                      <div>
                        <span className="text-muted-foreground">CIN:</span>{" "}
                        {vendor.companyDetails?.cinNumber || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">GST:</span>{" "}
                        {vendor.companyDetails?.gstNumber || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">PAN:</span>{" "}
                        {vendor.companyDetails?.panNumber || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Year:</span>{" "}
                        {vendor.companyDetails?.yearOfEstablishment || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Origin:</span>{" "}
                        {vendor.companyDetails?.companyOrigin || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Org Type:</span>{" "}
                        {vendor.companyDetails?.typeOfOrganisation || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">MSME:</span>{" "}
                        {vendor.companyDetails?.isMSME ? "Yes" : "No"}
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Address:</span>{" "}
                        {[
                          vendor.companyDetails?.registeredAddress?.line1,
                          vendor.companyDetails?.registeredAddress?.line2,
                          vendor.companyDetails?.registeredAddress?.district,
                          vendor.companyDetails?.registeredAddress?.state,
                          vendor.companyDetails?.registeredAddress?.pinCode,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </div>
                    </div>
                  </div>

                  {/* Classification */}
                  <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <h3 className="font-semibold text-sm">Classification</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Type:</span>{" "}
                        {classification?.vendorType || "Not classified"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Band:</span>{" "}
                        {classification?.capexBand
                          ? CAPEX_BANDS.find(
                              (b) => b.value === classification.capexBand
                            )?.label || classification.capexBand
                          : "—"}
                      </div>
                    </div>
                  </div>

                  {/* Completion */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Form Completion
                      </span>
                      <span className="font-medium">
                        {vendor.completionPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${vendor.completionPercentage}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ===== REVIEWERS TAB ===== */}
            <TabsContent value="reviewers" className="space-y-6 mt-4">
              {(
                ["site", "procurement", "financial"] as GradingSectionType[]
              ).map((section) => {
                const SIcon = SECTION_ICONS[section];
                const sectionAssignments = assignmentsForSection(section);
                const sectionRatings = ratingsForSection(section);
                const params = getParametersForSection(section);
                const hasRatings =
                  Object.keys(sectionRatings).length === params.length;

                return (
                  <div
                    key={section}
                    className="border border-border rounded-xl overflow-hidden"
                  >
                    <div className="bg-muted/50 px-4 py-3 flex items-center gap-3">
                      <SIcon className="w-5 h-5 text-primary" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">
                          {SECTION_LABELS[section]}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Responsibility: {SECTION_RESPONSIBILITY[section]}
                        </p>
                      </div>
                      {hasRatings ? (
                        <Badge variant="default" className="bg-emerald-500">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Rated
                        </Badge>
                      ) : sectionAssignments.length > 0 ? (
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          Assigned
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          Not assigned
                        </Badge>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Current assignments */}
                      {sectionAssignments.length > 0 && (
                        <div className="space-y-2">
                          {sectionAssignments.map((a) => (
                            <div
                              key={a.id}
                              className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2"
                            >
                              <div className="text-sm">
                                <span className="font-medium">
                                  {a.reviewerEmail}
                                </span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  assigned{" "}
                                  {new Date(a.assignedAt).toLocaleDateString()}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveAssignment(a.id!)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add new reviewer */}
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder={`Assign reviewer email for ${SECTION_LABELS[section]}...`}
                          value={newReviewerEmails[section]}
                          onChange={(e) =>
                            setNewReviewerEmails((prev) => ({
                              ...prev,
                              [section]: e.target.value,
                            }))
                          }
                          className="flex-1 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              handleAssignReviewer(section);
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAssignReviewer(section)}
                          disabled={assigning === section}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          {assigning === section ? "..." : "Assign"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            {/* ===== RATINGS TAB ===== */}
            <TabsContent value="ratings" className="space-y-6 mt-4">
              {(
                ["site", "procurement", "financial"] as GradingSectionType[]
              ).map((section) => {
                const SIcon = SECTION_ICONS[section];
                const params = getParametersForSection(section);
                const sectionRatings = ratingsForSection(section);
                const hasAny = Object.keys(sectionRatings).length > 0;

                // Compute section score
                const ratingValues: Record<string, number> = {};
                Object.entries(sectionRatings).forEach(([k, v]) => {
                  ratingValues[k] = v.rating;
                });
                let sectionScore = 0;
                params.forEach((p) => {
                  const r = ratingValues[p.key] || 0;
                  sectionScore += (r / 5) * p.weight;
                });
                sectionScore = Math.round(sectionScore * 100) / 100;
                const maxScore = params.reduce((s, p) => s + p.weight, 0);

                return (
                  <div
                    key={section}
                    className="border border-border rounded-xl overflow-hidden"
                  >
                    <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SIcon className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-sm">
                          {SECTION_LABELS[section]}
                        </h3>
                      </div>
                      {hasAny && (
                        <div className="text-right">
                          <span className="text-lg font-bold text-primary">
                            {sectionScore.toFixed(1)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            /{maxScore}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      {!hasAny ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No ratings submitted yet for this section.
                        </p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 px-2 font-medium">
                                #
                              </th>
                              <th className="text-left py-2 px-2 font-medium">
                                Parameter
                              </th>
                              <th className="text-center py-2 px-2 font-medium">
                                Weight
                              </th>
                              <th className="text-center py-2 px-2 font-medium">
                                Rating
                              </th>
                              <th className="text-center py-2 px-2 font-medium">
                                Score
                              </th>
                              <th className="text-left py-2 px-2 font-medium">
                                Rated By
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {params.map((param) => {
                              const r = sectionRatings[param.key];
                              const rating = r?.rating || 0;
                              const score =
                                rating > 0
                                  ? ((rating / 5) * param.weight).toFixed(2)
                                  : "—";

                              return (
                                <tr
                                  key={param.key}
                                  className="border-b border-border/50"
                                >
                                  <td className="py-2 px-2 text-muted-foreground">
                                    {param.srNo}
                                  </td>
                                  <td className="py-2 px-2">
                                    <p className="font-medium">{param.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {param.description}
                                    </p>
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    {param.weight}%
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    {rating > 0 ? (
                                      <div>
                                        <span className="font-bold">
                                          {rating}
                                        </span>
                                        <span className="text-muted-foreground">
                                          /5
                                        </span>
                                        <p className="text-[10px] text-muted-foreground">
                                          {RATING_LABELS[rating]}
                                        </p>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        —
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-2 text-center font-mono">
                                    {score}
                                  </td>
                                  <td className="py-2 px-2 text-xs text-muted-foreground">
                                    {r?.ratedBy || "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            {/* ===== GRADE TAB ===== */}
            <TabsContent value="grade" className="space-y-6 mt-4">
              {/* Current Grade Display */}
              {grade ? (
                <div className="space-y-4">
                  {/* Score breakdown */}
                  <div className="bg-muted/30 rounded-xl p-6">
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <HardHat className="w-5 h-5 text-primary mx-auto mb-1" />
                        <p className="text-2xl font-bold">
                          {grade.siteScore.toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Site (45%)
                        </p>
                      </div>
                      <div>
                        <ShoppingCart className="w-5 h-5 text-primary mx-auto mb-1" />
                        <p className="text-2xl font-bold">
                          {grade.procurementScore.toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Procurement (30%)
                        </p>
                      </div>
                      <div>
                        <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
                        <p className="text-2xl font-bold">
                          {grade.financialScore.toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Financial (25%)
                        </p>
                      </div>
                      <div className="border-l border-border">
                        <Star className="w-5 h-5 text-warning mx-auto mb-1" />
                        <p className="text-3xl font-black text-primary">
                          {grade.totalScore.toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total /100
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Grade result */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">
                        Computed Grade
                      </p>
                      {grade.computedGrade ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-xl font-black border ${
                              GRADE_COLORS[grade.computedGrade]?.bg || ""
                            } ${GRADE_COLORS[grade.computedGrade]?.text || ""}`}
                          >
                            {grade.computedGrade}
                          </span>
                          <div>
                            <p
                              className={`font-semibold ${
                                GRADE_COLORS[grade.computedGrade]?.text || ""
                              }`}
                            >
                              {getGradeForScore(grade.totalScore).category}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getGradeForScore(grade.totalScore).financialGate}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          Not computed
                        </span>
                      )}
                    </div>

                    {grade.adminOverrideGrade && (
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1">
                          Admin Override
                        </p>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-xl font-black border ${
                              GRADE_COLORS[grade.adminOverrideGrade]?.bg || ""
                            } ${
                              GRADE_COLORS[grade.adminOverrideGrade]?.text || ""
                            }`}
                          >
                            {grade.adminOverrideGrade}
                          </span>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              by {grade.overriddenBy}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {grade.overriddenAt
                                ? new Date(
                                    grade.overriddenAt
                                  ).toLocaleDateString()
                                : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Final Grade
                      </p>
                      {grade.finalGrade ? (
                        <span
                          className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-xl font-black border ${
                            GRADE_COLORS[grade.finalGrade]?.bg || ""
                          } ${GRADE_COLORS[grade.finalGrade]?.text || ""}`}
                        >
                          {grade.finalGrade}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-border pt-4 space-y-4">
                    {/* Recompute */}
                    <Button
                      variant="outline"
                      onClick={handleComputeGrade}
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Recompute Grade from Ratings
                    </Button>

                    {/* Override */}
                    <div className="flex items-center gap-3">
                      <Label className="text-sm whitespace-nowrap">
                        Override Grade:
                      </Label>
                      <Select
                        value={overrideGrade}
                        onValueChange={setOverrideGrade}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            No Override (use computed)
                          </SelectItem>
                          <SelectItem value="A">
                            A — Strategic Vendor
                          </SelectItem>
                          <SelectItem value="B">B — Approved Vendor</SelectItem>
                          <SelectItem value="C">
                            C — Conditional Vendor
                          </SelectItem>
                          <SelectItem value="D">
                            D — High-Risk Vendor
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleOverrideGrade}
                        disabled={overriding}
                        variant={
                          overrideGrade === "none" ? "outline" : "default"
                        }
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        {overriding ? "..." : "Apply"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">
                    No grade computed yet. Assign reviewers and wait for
                    ratings, or compute manually.
                  </p>
                  <Button onClick={handleComputeGrade}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Compute Grade Now
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VendorDetailModal;
