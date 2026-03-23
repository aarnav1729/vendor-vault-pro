import React, { useState, useEffect, useCallback, useRef } from "react";
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
  CAPEX_SUBTYPE_OPTIONS,
  CAPEX_BANDS,
  GradingSectionType,
  OPEX_BANDS,
  OPEX_SUBTYPE_OPTIONS,
  SECTION_LABELS,
  SECTION_RESPONSIBILITY,
  VENDOR_TYPE_OPTIONS,
  RATING_LABELS,
  getVendorBandLabel,
  getParametersForSection,
  GradeCategory,
  ReviewerAssignment,
  VendorRating,
  VendorGrade,
  getGradeForScore,
  getVendorSubtypeLabel,
  getVendorTypeLabel,
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
  initialVendor?: VendorFormData | null;
  initialClassification?: VendorClassification | null;
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

const UNCLASSIFIED_VALUE = "__unclassified__";
const NONE_VALUE = "__none__";
const DEFAULT_REVIEWER_EMAILS: Record<GradingSectionType, string> = {
  site: "",
  procurement: "",
  financial: "",
};

function createEmptyClassification(vendorId: string): VendorClassification {
  return {
    vendorId,
    vendorType: null,
    opexSubType: null,
    opexBand: null,
    capexSubType: null,
    capexBand: null,
    scores: {
      companyDetails: 0,
      financialDetails: 0,
      bankDetails: 0,
      references: 0,
      documents: 0,
    },
    totalScore: 0,
    notes: "",
    dueDiligenceSent: false,
    infoRequestSent: false,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const VendorDetailModal: React.FC<VendorDetailModalProps> = ({
  vendorId,
  initialVendor,
  initialClassification,
  open,
  onOpenChange,
  onUpdate,
}) => {
  const [vendor, setVendor] = useState<VendorFormData | null>(
    initialVendor || null
  );
  const [classification, setClassification] =
    useState<VendorClassification | null>(initialClassification || null);
  const [assignments, setAssignments] = useState<ReviewerAssignment[]>([]);
  const [ratings, setRatings] = useState<VendorRating[]>([]);
  const [grade, setGrade] = useState<VendorGrade | null>(null);
  const [baseLoading, setBaseLoading] = useState(false);
  const [supplementaryLoading, setSupplementaryLoading] = useState(false);
  const [supplementaryLoaded, setSupplementaryLoaded] = useState(false);
  const [savingClassification, setSavingClassification] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const baseRequestRef = useRef(0);
  const supplementaryRequestRef = useRef(0);

  // Reviewer assignment form states
  const [newReviewerEmails, setNewReviewerEmails] = useState<
    Record<GradingSectionType, string>
  >(DEFAULT_REVIEWER_EMAILS);
  const [assigning, setAssigning] = useState<string | null>(null);

  // Override grade
  const [overrideGrade, setOverrideGrade] = useState<string>("none");
  const [overriding, setOverriding] = useState(false);

  const { toast } = useToast();

  const loadBaseData = useCallback(async () => {
    if (!vendorId) return;
    const requestId = ++baseRequestRef.current;
    setBaseLoading(true);
    try {
      const [v, cl] = await Promise.all([
        getVendorById(vendorId).catch(() => null),
        getClassification(vendorId).catch(() => null),
      ]);
      if (baseRequestRef.current !== requestId) return;

      setVendor(v || initialVendor || null);
      setClassification(
        cl || initialClassification || createEmptyClassification(vendorId)
      );
    } catch (e) {
      console.error("Failed to load vendor detail data:", e);
    } finally {
      if (baseRequestRef.current === requestId) {
        setBaseLoading(false);
      }
    }
  }, [vendorId, initialVendor, initialClassification]);

  useEffect(() => {
    if (open && vendorId) {
      supplementaryRequestRef.current += 1;
      setActiveTab("details");
      setVendor(initialVendor || null);
      setClassification(
        initialClassification || createEmptyClassification(vendorId)
      );
      setAssignments([]);
      setRatings([]);
      setGrade(null);
      setOverrideGrade("none");
      setSupplementaryLoaded(false);
      setSupplementaryLoading(false);
      setNewReviewerEmails(DEFAULT_REVIEWER_EMAILS);
      loadBaseData();
    }
  }, [open, vendorId, initialVendor, initialClassification, loadBaseData]);

  const loadSupplementaryData = useCallback(
    async (force = false) => {
      if (
        !vendorId ||
        (!force && (supplementaryLoaded || supplementaryLoading))
      ) {
        return;
      }

      const requestId = ++supplementaryRequestRef.current;
      setSupplementaryLoading(true);
      try {
        const [asn, rat, gr] = await Promise.all([
          getReviewerAssignments(vendorId).catch(() => []),
          getVendorAllRatings(vendorId).catch(() => []),
          getVendorGrade(vendorId).catch(() => null),
        ]);

        if (supplementaryRequestRef.current !== requestId) return;

        setAssignments(asn || []);
        setRatings(rat || []);
        setGrade(gr || null);
        setOverrideGrade(gr?.adminOverrideGrade || "none");
        setSupplementaryLoaded(true);
      } catch (e) {
        console.error("Failed to load vendor review data:", e);
      } finally {
        if (supplementaryRequestRef.current === requestId) {
          setSupplementaryLoading(false);
        }
      }
    },
    [vendorId, supplementaryLoaded, supplementaryLoading]
  );

  useEffect(() => {
    if (open && activeTab !== "details") {
      loadSupplementaryData();
    }
  }, [open, activeTab, loadSupplementaryData]);

  const handleSaveClassification = async () => {
    if (!vendorId) return;

    const payload = classification || createEmptyClassification(vendorId);
    setSavingClassification(true);
    try {
      await saveClassification(payload);
      setClassification(payload);
      toast({
        title: "Classification saved",
        description: [
          getVendorTypeLabel(payload.vendorType),
          getVendorSubtypeLabel(payload),
        ]
          .filter(Boolean)
          .join(" • ") || "Vendor moved to unclassified",
      });
      onUpdate?.();
    } catch (e: unknown) {
      toast({
        title: "Save failed",
        description: getErrorMessage(e),
        variant: "destructive",
      });
    } finally {
      setSavingClassification(false);
    }
  };

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
      await loadSupplementaryData(true);
    } catch (e: unknown) {
      toast({
        title: "Assignment failed",
        description: getErrorMessage(e),
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
      await loadSupplementaryData(true);
    } catch (e: unknown) {
      toast({
        title: "Remove failed",
        description: getErrorMessage(e),
        variant: "destructive",
      });
    }
  };

  const handleComputeGrade = async () => {
    if (!vendorId) return;
    try {
      await computeVendorGrade(vendorId);
      toast({ title: "Grade recomputed" });
      await loadSupplementaryData(true);
      onUpdate?.();
    } catch (e: unknown) {
      toast({
        title: "Compute failed",
        description: getErrorMessage(e),
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
      await loadSupplementaryData(true);
      onUpdate?.();
    } catch (e: unknown) {
      toast({
        title: "Override failed",
        description: getErrorMessage(e),
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

  const editableClassification =
    classification || (vendorId ? createEmptyClassification(vendorId) : null);
  const companyName =
    vendor?.companyDetails?.companyName ||
    initialVendor?.companyDetails?.companyName ||
    "Vendor Details";

  if (!vendorId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {companyName}
          </DialogTitle>
        </DialogHeader>

        {baseLoading ? (
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
                  <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm">
                          Vendor Classification
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Opex segregation: Raw Material, Consumables, Service
                          Vendors. Capex segregation: Civil Vendors, Plant &
                          Machinery, Utilities, Service Vendors.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {editableClassification?.vendorType ? (
                          <Badge
                            variant={
                              editableClassification.vendorType === "capex"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {getVendorTypeLabel(
                              editableClassification.vendorType
                            )}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Unclassified</Badge>
                        )}
                        {getVendorSubtypeLabel(editableClassification) && (
                          <Badge variant="outline">
                            {getVendorSubtypeLabel(editableClassification)}
                          </Badge>
                        )}
                        {getVendorBandLabel(editableClassification) && (
                          <Badge variant="outline">
                            {getVendorBandLabel(editableClassification)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Vendor Type</Label>
                        <Select
                          value={
                            editableClassification?.vendorType ||
                            UNCLASSIFIED_VALUE
                          }
                          onValueChange={(value) => {
                            const nextType =
                              value === UNCLASSIFIED_VALUE
                                ? null
                                : (value as "capex" | "opex");
                            setClassification((prev) => {
                              const next =
                                prev || createEmptyClassification(vendorId);
                              if (nextType === "capex") {
                                return {
                                  ...next,
                                  vendorType: "capex",
                                  opexSubType: null,
                                  opexBand: null,
                                  capexSubType:
                                    prev?.vendorType === "capex"
                                      ? prev.capexSubType
                                      : null,
                                  capexBand:
                                    prev?.vendorType === "capex"
                                      ? prev.capexBand
                                      : null,
                                };
                              }
                              if (nextType === "opex") {
                                return {
                                  ...next,
                                  vendorType: "opex",
                                  opexSubType:
                                    prev?.vendorType === "opex"
                                      ? prev.opexSubType
                                      : null,
                                  opexBand:
                                    prev?.vendorType === "opex"
                                      ? prev.opexBand
                                      : null,
                                  capexSubType: null,
                                  capexBand: null,
                                };
                              }
                              return {
                                ...next,
                                vendorType: null,
                                opexSubType: null,
                                opexBand: null,
                                capexSubType: null,
                                capexBand: null,
                              };
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select vendor type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNCLASSIFIED_VALUE}>
                              Unclassified
                            </SelectItem>
                            {VENDOR_TYPE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {editableClassification?.vendorType === "opex" && (
                        <div className="space-y-2">
                          <Label>Opex Segregation</Label>
                          <Select
                            value={
                              editableClassification.opexSubType || NONE_VALUE
                            }
                            onValueChange={(value) =>
                              setClassification((prev) => ({
                                ...(prev || createEmptyClassification(vendorId)),
                                vendorType: "opex",
                                opexSubType:
                                  value === NONE_VALUE
                                    ? null
                                    : (value as NonNullable<
                                        VendorClassification["opexSubType"]
                                      >),
                                opexBand: prev?.opexBand || null,
                                capexSubType: null,
                                capexBand: null,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select opex segregation" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE_VALUE}>
                                Not set
                              </SelectItem>
                              {OPEX_SUBTYPE_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {editableClassification?.vendorType === "capex" && (
                        <>
                          <div className="space-y-2">
                            <Label>Capex Segregation</Label>
                            <Select
                              value={
                                editableClassification.capexSubType ||
                                NONE_VALUE
                              }
                              onValueChange={(value) =>
                                setClassification((prev) => ({
                                  ...(prev ||
                                    createEmptyClassification(vendorId)),
                                  vendorType: "capex",
                                  opexSubType: null,
                                  opexBand: null,
                                  capexSubType:
                                    value === NONE_VALUE
                                      ? null
                                      : (value as NonNullable<
                                          VendorClassification["capexSubType"]
                                        >),
                                  capexBand: prev?.capexBand || null,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select capex segregation" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NONE_VALUE}>
                                  Not set
                                </SelectItem>
                                {CAPEX_SUBTYPE_OPTIONS.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Capex Band</Label>
                            <Select
                              value={editableClassification.capexBand || NONE_VALUE}
                              onValueChange={(value) =>
                                setClassification((prev) => ({
                                  ...(prev ||
                                    createEmptyClassification(vendorId)),
                                  vendorType: "capex",
                                  opexSubType: null,
                                  opexBand: null,
                                  capexSubType: prev?.capexSubType || null,
                                  capexBand:
                                    value === NONE_VALUE
                                      ? null
                                      : (value as NonNullable<
                                          VendorClassification["capexBand"]
                                        >),
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select capex band" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NONE_VALUE}>Not set</SelectItem>
                                {CAPEX_BANDS.map((band) => (
                                  <SelectItem
                                    key={band.value}
                                    value={band.value || NONE_VALUE}
                                  >
                                    {band.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      {editableClassification?.vendorType === "opex" && (
                        <div className="space-y-2">
                          <Label>Opex Band</Label>
                          <Select
                            value={editableClassification.opexBand || NONE_VALUE}
                            onValueChange={(value) =>
                              setClassification((prev) => ({
                                ...(prev || createEmptyClassification(vendorId)),
                                vendorType: "opex",
                                opexSubType: prev?.opexSubType || null,
                                opexBand:
                                  value === NONE_VALUE
                                    ? null
                                    : (value as NonNullable<
                                        VendorClassification["opexBand"]
                                      >),
                                capexSubType: null,
                                capexBand: null,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select opex band" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE_VALUE}>Not set</SelectItem>
                              {OPEX_BANDS.map((band) => (
                                <SelectItem
                                  key={band.value}
                                  value={band.value || NONE_VALUE}
                                >
                                  {band.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        This updates the shared admin classification used by the
                        dashboard, analytics, and rankings.
                      </p>
                      <Button
                        onClick={handleSaveClassification}
                        disabled={savingClassification}
                      >
                        {savingClassification
                          ? "Saving..."
                          : "Save Classification"}
                      </Button>
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
              {supplementaryLoading && !supplementaryLoaded ? (
                <div className="py-12 text-center text-muted-foreground animate-pulse">
                  Loading reviewer assignments...
                </div>
              ) : (
                (["site", "procurement", "financial"] as GradingSectionType[]).map(
                  (section) => {
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
                                      {new Date(
                                        a.assignedAt
                                      ).toLocaleDateString()}
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
                  }
                )
              )}
            </TabsContent>

            {/* ===== RATINGS TAB ===== */}
            <TabsContent value="ratings" className="space-y-6 mt-4">
              {supplementaryLoading && !supplementaryLoaded ? (
                <div className="py-12 text-center text-muted-foreground animate-pulse">
                  Loading ratings...
                </div>
              ) : (
                (["site", "procurement", "financial"] as GradingSectionType[]).map(
                  (section) => {
                    const SIcon = SECTION_ICONS[section];
                    const params = getParametersForSection(section);
                    const sectionRatings = ratingsForSection(section);
                    const hasAny = Object.keys(sectionRatings).length > 0;

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
                                        <p className="font-medium">
                                          {param.name}
                                        </p>
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
                  }
                )
              )}
            </TabsContent>

            {/* ===== GRADE TAB ===== */}
            <TabsContent value="grade" className="space-y-6 mt-4">
              {/* Current Grade Display */}
              {supplementaryLoading && !supplementaryLoaded ? (
                <div className="py-12 text-center text-muted-foreground animate-pulse">
                  Loading grade summary...
                </div>
              ) : grade ? (
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
