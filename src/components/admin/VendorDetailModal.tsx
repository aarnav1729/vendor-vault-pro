import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  VendorFormData,
  VendorClassification,
  ScoringMatrix,
  VendorType,
  OpexSubType,
  CapexSubType,
  CapexBand,
  CAPEX_BANDS,
} from "@/types/vendor";
import {
  Building2,
  TrendingUp,
  Landmark,
  FileCheck,
  Users,
  FolderOpen,
  Save,
  Mail,
  FileText,
  Eye,
} from "lucide-react";

interface Props {
  vendor: VendorFormData;
  classification?: VendorClassification;
  scoringMatrix: ScoringMatrix | null;
  onClose: () => void;
  onSaveClassification: (classification: VendorClassification) => Promise<void>;
}

const OPEX_SUBTYPES = [
  { value: "raw_material", label: "Raw Material" },
  { value: "consumables", label: "Consumables" },
  { value: "service", label: "Service" },
];

const CAPEX_SUBTYPES = [
  { value: "civil", label: "Civil Vendors" },
  { value: "plant_machinery", label: "Plant & Machinery" },
  { value: "utilities", label: "Utilities" },
  { value: "service", label: "Service" },
];

export const VendorDetailModal: React.FC<Props> = ({
  vendor,
  classification: initialClassification,
  scoringMatrix,
  onClose,
  onSaveClassification,
}) => {
  const [localClassification, setLocalClassification] =
    useState<VendorClassification>(() => ({
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
      notes: initialClassification?.notes || "",
      dueDiligenceSent: initialClassification?.dueDiligenceSent || false,
      infoRequestSent: initialClassification?.infoRequestSent || false,
    }));

  const [saving, setSaving] = useState(false);

  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [pickerDoc, setPickerDoc] = useState<{
    docName: string;
    files: any[];
  } | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTitle, setViewerTitle] = useState<string>("");
  const [viewerUrl, setViewerUrl] = useState<string>("");
  const [viewerMime, setViewerMime] = useState<string>("");

  // track blob URLs we create so we can revoke them
  const [createdBlobUrl, setCreatedBlobUrl] = useState<string>("");

  const guessMimeFromName = (name?: string) => {
    const n = (name || "").toLowerCase();
    if (n.endsWith(".pdf")) return "application/pdf";
    if (n.endsWith(".png")) return "image/png";
    if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
    if (n.endsWith(".webp")) return "image/webp";
    if (n.endsWith(".gif")) return "image/gif";
    return "";
  };

  const resolveFileToUrl = (
    file: any
  ): { url: string; mime: string; name: string } => {
    // Case 1: string (url or dataUrl)
    if (typeof file === "string") {
      const s = file.trim();
      if (s.startsWith("data:")) {
        const mime = s.slice(5, s.indexOf(";")) || "";
        return { url: s, mime, name: "Document" };
      }
      return {
        url: s,
        mime: guessMimeFromName(s),
        name: s.split("/").pop() || "Document",
      };
    }

    // Case 2: File/Blob
    if (file instanceof Blob) {
      const url = URL.createObjectURL(file);
      return {
        url,
        mime: (file as any).type || "",
        name: (file as any).name || "Document",
      };
    }

    // Case 3: object shapes from DB/IndexedDB
    const name =
      file?.name ||
      file?.fileName ||
      file?.filename ||
      file?.originalName ||
      "Document";

    const mime =
      file?.type || file?.mimeType || file?.mime || guessMimeFromName(name);

    // Common fields people store
    const directUrl =
      file?.url || file?.downloadUrl || file?.publicUrl || file?.path;
    if (directUrl && typeof directUrl === "string") {
      return { url: directUrl, mime, name };
    }

    const dataUrl = file?.dataUrl || file?.dataURI;
    if (dataUrl && typeof dataUrl === "string") {
      const inferred = dataUrl.startsWith("data:")
        ? dataUrl.slice(5, dataUrl.indexOf(";")) || ""
        : mime;
      return { url: dataUrl, mime: inferred || mime, name };
    }

    // base64 stored separately
    const base64 = file?.base64 || file?.contentBase64;
    if (base64 && typeof base64 === "string") {
      const safeMime = mime || "application/octet-stream";
      return { url: `data:${safeMime};base64,${base64}`, mime: safeMime, name };
    }

    // unknown shape
    return { url: "", mime, name };
  };

  const openViewerForFile = (docName: string, file: any) => {
    // cleanup any old blob url we created
    if (createdBlobUrl) {
      try {
        URL.revokeObjectURL(createdBlobUrl);
      } catch {}
      setCreatedBlobUrl("");
    }

    const resolved = resolveFileToUrl(file);
    if (!resolved.url) return;

    // remember if it's a blob url we created
    if (resolved.url.startsWith("blob:")) setCreatedBlobUrl(resolved.url);

    setViewerTitle(`${docName}${resolved.name ? ` • ${resolved.name}` : ""}`);
    setViewerUrl(resolved.url);
    setViewerMime(resolved.mime || "");
    setViewerOpen(true);
  };

  useEffect(() => {
    return () => {
      if (createdBlobUrl) {
        try {
          URL.revokeObjectURL(createdBlobUrl);
        } catch {}
      }
    };
  }, [createdBlobUrl]);

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
        scores.documents * scoringMatrix.documentsWeight) /
      100;

    setLocalClassification((prev) => ({
      ...prev,
      totalScore: Math.round(total * 10) / 10,
    }));
  };

  const updateScore = (
    category: keyof typeof localClassification.scores,
    value: number
  ) => {
    setLocalClassification((prev) => ({
      ...prev,
      scores: { ...prev.scores, [category]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSaveClassification(localClassification);
    setSaving(false);
    onClose();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
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
                {vendor.companyDetails.companyName || "Unnamed Vendor"}
              </h2>
              <p className="text-sm text-muted-foreground font-normal">
                {vendor.email}
              </p>
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
                        <span>{vendor.companyDetails.cinNumber || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">GST:</span>
                        <span>{vendor.companyDetails.gstNumber || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">PAN:</span>
                        <span>{vendor.companyDetails.panNumber || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Established:
                        </span>
                        <span>
                          {vendor.companyDetails.yearOfEstablishment || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Origin:</span>
                        <span>
                          {vendor.companyDetails.companyOrigin || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">MSME:</span>
                        <span>
                          {vendor.companyDetails.isMSME ? "Yes" : "No"}
                        </span>
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
                        <span className="text-muted-foreground">
                          FY 2022-23:
                        </span>
                        <span>
                          {formatCurrency(
                            vendor.financialDetails.annualTurnover.fy2022_23
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          FY 2023-24:
                        </span>
                        <span>
                          {formatCurrency(
                            vendor.financialDetails.annualTurnover.fy2023_24
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          FY 2024-25:
                        </span>
                        <span>
                          {formatCurrency(
                            vendor.financialDetails.annualTurnover.fy2024_25
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          FY 2025-26:
                        </span>
                        <span>
                          {formatCurrency(
                            vendor.financialDetails.annualTurnover.fy2025_26
                          )}
                        </span>
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
                      <span>{vendor.bankDetails.bankName || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">
                        Branch:
                      </span>
                      <span>{vendor.bankDetails.branch || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">
                        Account:
                      </span>
                      <span>{vendor.bankDetails.accountNumber || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">IFSC:</span>
                      <span>{vendor.bankDetails.ifscCode || "-"}</span>
                    </div>
                  </div>
                </div>

                {/* References */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-primary" />
                    References (
                    {
                      vendor.vendorReferences.filter((r) => r.companyName)
                        .length
                    }
                    )
                  </h3>
                  <div className="space-y-2">
                    {vendor.vendorReferences
                      .filter((r) => r.companyName)
                      .map((ref, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{ref.companyName}</p>
                            <p className="text-sm text-muted-foreground">
                              {ref.contactPersonName} • {ref.currentStatus}
                            </p>
                          </div>
                          <span className="text-sm">
                            {formatCurrency(ref.poValue)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Contacts */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Contact Persons (
                    {vendor.contactPersons.filter((c) => c.name).length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {vendor.contactPersons
                      .filter((c) => c.name)
                      .map((contact, i) => (
                        <div key={i} className="p-3 bg-muted/50 rounded-lg">
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {contact.designation}
                          </p>
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
                        value={localClassification.vendorType || ""}
                        onValueChange={(v) =>
                          setLocalClassification((prev) => ({
                            ...prev,
                            vendorType: v as VendorType,
                            opexSubType: null,
                            capexSubType: null,
                          }))
                        }
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

                    {localClassification.vendorType === "opex" && (
                      <div className="space-y-2">
                        <Label>Opex Sub-Type</Label>
                        <Select
                          value={localClassification.opexSubType || ""}
                          onValueChange={(v) =>
                            setLocalClassification((prev) => ({
                              ...prev,
                              opexSubType: v as OpexSubType,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select sub-type" />
                          </SelectTrigger>
                          <SelectContent>
                            {OPEX_SUBTYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {localClassification.vendorType === "capex" && (
                      <div className="space-y-2">
                        <Label>Capex Sub-Type</Label>
                        <Select
                          value={localClassification.capexSubType || ""}
                          onValueChange={(v) =>
                            setLocalClassification((prev) => ({
                              ...prev,
                              capexSubType: v as CapexSubType,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select sub-type" />
                          </SelectTrigger>
                          <SelectContent>
                            {CAPEX_SUBTYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
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
                        value={localClassification.capexBand || ""}
                        onValueChange={(v) =>
                          setLocalClassification((prev) => ({
                            ...prev,
                            capexBand: v as CapexBand,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select band" />
                        </SelectTrigger>
                        <SelectContent>
                          {CAPEX_BANDS.map((b) => (
                            <SelectItem key={b.value!} value={b.value!}>
                              {b.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={localClassification.notes || ""}
                        onChange={(e) =>
                          setLocalClassification((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
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
                    <span className="text-3xl font-bold text-primary">
                      {localClassification.totalScore}
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  {[
                    {
                      key: "companyDetails",
                      label: "Company Details",
                      weight: scoringMatrix?.companyDetailsWeight,
                    },
                    {
                      key: "financialDetails",
                      label: "Financial Details",
                      weight: scoringMatrix?.financialDetailsWeight,
                    },
                    {
                      key: "bankDetails",
                      label: "Bank Details",
                      weight: scoringMatrix?.bankDetailsWeight,
                    },
                    {
                      key: "references",
                      label: "References",
                      weight: scoringMatrix?.referencesWeight,
                    },
                    {
                      key: "documents",
                      label: "Documents",
                      weight: scoringMatrix?.documentsWeight,
                    },
                  ].map(({ key, label, weight }) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>
                          {label} (Weight: {weight}%)
                        </Label>
                        <span className="font-medium">
                          {
                            localClassification.scores[
                              key as keyof typeof localClassification.scores
                            ]
                          }
                          /10
                        </span>
                      </div>
                      <Slider
                        value={[
                          localClassification.scores[
                            key as keyof typeof localClassification.scores
                          ],
                        ]}
                        onValueChange={([v]) =>
                          updateScore(
                            key as keyof typeof localClassification.scores,
                            v
                          )
                        }
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
                      doc.attached ? "bg-success/10" : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText
                        className={`w-4 h-4 ${
                          doc.attached
                            ? "text-success"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span>{doc.docName}</span>
                    </div>
                    {doc.attached && doc.files.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {doc.files.length} file(s)
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            if (doc.files.length === 1) {
                              openViewerForFile(doc.docName, doc.files[0]);
                            } else {
                              setPickerDoc({
                                docName: doc.docName,
                                files: doc.files,
                              });
                              setFilePickerOpen(true);
                            }
                          }}
                          title="View document"
                        >
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
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Classification"}
              </Button>
            </div>
          </div>
        </ScrollArea>
        {/* File Picker (when multiple files exist under a document) */}
        <Dialog
          open={filePickerOpen}
          onOpenChange={(o) => {
            setFilePickerOpen(o);
            if (!o) setPickerDoc(null);
          }}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{pickerDoc?.docName || "Files"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-2">
              {(pickerDoc?.files || []).map((f, idx) => {
                const resolved = resolveFileToUrl(f);
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {resolved.name || `File ${idx + 1}`}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {resolved.mime || "Unknown type"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          openViewerForFile(pickerDoc?.docName || "Document", f)
                        }
                        disabled={!resolved.url}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>

                      {resolved.url && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(
                              resolved.url,
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                        >
                          Open
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Inline Viewer */}
        <Dialog
          open={viewerOpen}
          onOpenChange={(o) => {
            setViewerOpen(o);
            if (!o) {
              // cleanup blob url if we created one
              if (createdBlobUrl) {
                try {
                  URL.revokeObjectURL(createdBlobUrl);
                } catch {}
                setCreatedBlobUrl("");
              }
              setViewerUrl("");
              setViewerMime("");
              setViewerTitle("");
            }
          }}
        >
          <DialogContent className="max-w-6xl h-[85vh] p-0">
            <DialogHeader className="p-4 pb-2">
              <DialogTitle className="truncate">
                {viewerTitle || "Document Viewer"}
              </DialogTitle>
            </DialogHeader>

            <div className="px-4 pb-4 h-[calc(85vh-56px)]">
              {!viewerUrl ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No file to preview.
                </div>
              ) : (
                (() => {
                  const mime = (viewerMime || "").toLowerCase();
                  const isPdf =
                    mime.includes("pdf") ||
                    viewerUrl.toLowerCase().includes(".pdf");
                  const isImage =
                    mime.startsWith("image/") ||
                    /\.(png|jpg|jpeg|webp|gif)$/i.test(viewerUrl);

                  if (isImage) {
                    return (
                      <div className="h-full w-full overflow-auto rounded-lg border border-border bg-black/5">
                        <img
                          src={viewerUrl}
                          alt={viewerTitle}
                          className="max-w-full mx-auto"
                        />
                      </div>
                    );
                  }

                  // PDF + generic viewer (iframe). If blocked by CSP/CORS, user can still "Open" from picker.
                  return (
                    <iframe
                      title="Document Preview"
                      src={viewerUrl}
                      className="w-full h-full rounded-lg border border-border bg-background"
                    />
                  );
                })()
              )}
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};
