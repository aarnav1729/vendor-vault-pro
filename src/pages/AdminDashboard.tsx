import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllVendors,
  getVendorById,
  getAllClassifications,
  saveClassification,
  getScoringMatrix,
  saveScoringMatrix,
} from "@/lib/db";

import {
  VendorFormData,
  VendorClassification,
  ScoringMatrix,
  CAPEX_BANDS,
} from "@/types/vendor";
import VendorDetailModal from "@/components/admin/VendorDetailModal";
import { ScoringMatrixEditor } from "@/components/admin/ScoringMatrixEditor";
import { AnalyticsCharts } from "@/components/admin/AnalyticsCharts";
import {
  Building2,
  Search,
  Filter,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Mail,
  Eye,
  ArrowUpDown,
  Settings,
  Users,
  TrendingUp,
  Trophy,
  BarChart3,
} from "lucide-react";

const AdminDashboard: React.FC = () => {
  const [vendors, setVendors] = useState<VendorFormData[]>([]);
  const [classifications, setClassifications] = useState<
    Map<string, VendorClassification>
  >(new Map());
  const [scoringMatrix, setScoringMatrix] = useState<ScoringMatrix | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterComplete, setFilterComplete] = useState<
    "all" | "complete" | "incomplete"
  >("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(
    new Set()
  );
  const [selectedVendor, setSelectedVendor] = useState<VendorFormData | null>(
    null
  );
  const [showScoring, setShowScoring] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const { user, logout, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.verified || !isAdmin) {
      navigate("/");
      return;
    }
    loadData();
  }, [user, isAdmin]);

  const loadData = async () => {
    try {
      const [vendorList, classificationList, matrix] = await Promise.all([
        getAllVendors(),
        getAllClassifications(),
        getScoringMatrix(),
      ]);

      setVendors(vendorList);

      const classMap = new Map<string, VendorClassification>();
      classificationList.forEach((c) => classMap.set(c.vendorId, c));
      setClassifications(classMap);

      setScoringMatrix(matrix);
    } catch (e: any) {
      console.error("Admin loadData failed:", e);
      toast({
        title: "Failed to load",
        description: String(e?.message || e),
        variant: "destructive",
      });
      setVendors([]);
      setClassifications(new Map());
    }
  };

  const filteredVendors = useMemo(() => {
    let result = vendors;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.companyDetails.companyName.toLowerCase().includes(query) ||
          v.email.toLowerCase().includes(query) ||
          v.companyDetails.gstNumber.toLowerCase().includes(query) ||
          v.companyDetails.panNumber.toLowerCase().includes(query)
      );
    }

    // Completion filter
    if (filterComplete === "complete") {
      result = result.filter((v) => v.completionPercentage === 100);
    } else if (filterComplete === "incomplete") {
      result = result.filter((v) => v.completionPercentage < 100);
    }

    // Type filter
    if (filterType !== "all") {
      result = result.filter((v) => {
        const classification = classifications.get(v.id!);
        return classification?.vendorType === filterType;
      });
    }

    // Sorting
    if (sortConfig) {
      result = [...result].sort((a, b) => {
        let aVal: any, bVal: any;

        switch (sortConfig.key) {
          case "companyName":
            aVal = a.companyDetails.companyName;
            bVal = b.companyDetails.companyName;
            break;
          case "completion":
            aVal = a.completionPercentage;
            bVal = b.completionPercentage;
            break;
          case "email":
            aVal = a.email;
            bVal = b.email;
            break;
          case "updatedAt":
            aVal = new Date(a.updatedAt);
            bVal = new Date(b.updatedAt);
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [
    vendors,
    searchQuery,
    filterComplete,
    filterType,
    classifications,
    sortConfig,
  ]);

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const handleSelectAll = () => {
    if (selectedVendors.size === filteredVendors.length) {
      setSelectedVendors(new Set());
    } else {
      setSelectedVendors(new Set(filteredVendors.map((v) => v.id!)));
    }
  };

  const handleSelectVendor = (id: string) => {
    const newSelected = new Set(selectedVendors);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedVendors(newSelected);
  };

  const handleSendDueDiligence = () => {
    const selectedEmails = filteredVendors
      .filter((v) => selectedVendors.has(v.id!))
      .map((v) => v.email);

    const mailtoLink = `mailto:duediligence@example.com?subject=Vendor Due Diligence Request&body=Please conduct due diligence for the following vendors:%0A%0A${selectedEmails.join(
      "%0A"
    )}`;
    window.location.href = mailtoLink;

    toast({
      title: "Email Client Opened",
      description: `Prepared due diligence email for ${selectedEmails.length} vendor(s).`,
    });
  };

  const handleRequestInfo = (vendor: VendorFormData) => {
    const mailtoLink = `mailto:${vendor.email}?subject=Additional Information Required - Vendor Registration&body=Dear Vendor,%0A%0AWe require additional information for your vendor registration. Please log in to the portal and update your details.%0A%0ARegards,%0APremier Energies`;
    window.location.href = mailtoLink;
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const stats = useMemo(() => {
    const total = vendors.length;
    const complete = vendors.filter(
      (v) => v.completionPercentage === 100
    ).length;
    const capex = Array.from(classifications.values()).filter(
      (c) => c.vendorType === "capex"
    ).length;
    const opex = Array.from(classifications.values()).filter(
      (c) => c.vendorType === "opex"
    ).length;

    return { total, complete, incomplete: total - complete, capex, opex };
  }, [vendors, classifications]);

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
                <h1 className="font-semibold text-lg">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin/rankings")}
              >
                <Trophy className="w-4 h-4 mr-2" />
                Rankings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowScoring(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Scoring Matrix
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="vendors" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="vendors" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Vendors
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vendors" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-sm text-muted-foreground">
                      Total Vendors
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.complete}</p>
                    <p className="text-sm text-muted-foreground">Complete</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.incomplete}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-info" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.capex}</p>
                    <p className="text-sm text-muted-foreground">Capex</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.opex}</p>
                    <p className="text-sm text-muted-foreground">Opex</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-card rounded-xl border border-border p-4 mb-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[250px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by company, email, GST, PAN..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select
                  value={filterComplete}
                  onValueChange={(v: any) => setFilterComplete(v)}
                >
                  <SelectTrigger className="w-[160px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="incomplete">Incomplete</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="capex">Capex</SelectItem>
                    <SelectItem value="opex">Opex</SelectItem>
                  </SelectContent>
                </Select>
                {selectedVendors.size > 0 && (
                  <Button variant="accent" onClick={handleSendDueDiligence}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Due Diligence ({selectedVendors.size})
                  </Button>
                )}
              </div>
            </div>

            {/* Vendors Table */}
            <div className="table-container">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-4 text-left w-12">
                        <Checkbox
                          checked={
                            selectedVendors.size === filteredVendors.length &&
                            filteredVendors.length > 0
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th
                        className="p-4 text-left cursor-pointer hover:bg-muted/80"
                        onClick={() => handleSort("companyName")}
                      >
                        <div className="flex items-center gap-2">
                          Company
                          <ArrowUpDown className="w-4 h-4" />
                        </div>
                      </th>
                      <th
                        className="p-4 text-left cursor-pointer hover:bg-muted/80"
                        onClick={() => handleSort("email")}
                      >
                        <div className="flex items-center gap-2">
                          Email
                          <ArrowUpDown className="w-4 h-4" />
                        </div>
                      </th>
                      <th
                        className="p-4 text-left cursor-pointer hover:bg-muted/80"
                        onClick={() => handleSort("completion")}
                      >
                        <div className="flex items-center gap-2">
                          Completion
                          <ArrowUpDown className="w-4 h-4" />
                        </div>
                      </th>
                      <th className="p-4 text-left">Type</th>
                      <th className="p-4 text-left">Band</th>
                      <th className="p-4 text-left">Score</th>
                      <th
                        className="p-4 text-left cursor-pointer hover:bg-muted/80"
                        onClick={() => handleSort("updatedAt")}
                      >
                        <div className="flex items-center gap-2">
                          Updated
                          <ArrowUpDown className="w-4 h-4" />
                        </div>
                      </th>
                      <th className="p-4 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendors.map((vendor) => {
                      const classification = classifications.get(vendor.id!);
                      const isComplete = vendor.completionPercentage === 100;

                      return (
                        <tr
                          key={vendor.id}
                          className="border-t border-border hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-4">
                            <Checkbox
                              checked={selectedVendors.has(vendor.id!)}
                              onCheckedChange={() =>
                                handleSelectVendor(vendor.id!)
                              }
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {isComplete && (
                                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                              )}
                              <span className="font-medium">
                                {vendor.companyDetails.companyName ||
                                  "Unnamed Vendor"}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {vendor.email}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    vendor.completionPercentage === 100
                                      ? "bg-success"
                                      : vendor.completionPercentage >= 50
                                      ? "bg-warning"
                                      : "bg-destructive"
                                  }`}
                                  style={{
                                    width: `${vendor.completionPercentage}%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm">
                                {vendor.completionPercentage}%
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            {classification?.vendorType && (
                              <Badge
                                variant={
                                  classification.vendorType === "capex"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {classification.vendorType.toUpperCase()}
                              </Badge>
                            )}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {classification?.capexBand &&
                              CAPEX_BANDS.find(
                                (b) => b.value === classification.capexBand
                              )?.label}
                          </td>
                          <td className="p-4">
                            {classification?.totalScore !== undefined && (
                              <span className="font-medium">
                                {classification.totalScore}
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {new Date(vendor.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  try {
                                    const full = await getVendorById(
                                      vendor.id!
                                    );
                                    setSelectedVendor(full || vendor);
                                  } catch (e) {
                                    setSelectedVendor(vendor);
                                  }
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRequestInfo(vendor)}
                              >
                                <Mail className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredVendors.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="p-8 text-center text-muted-foreground"
                        >
                          No vendors found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsCharts
              vendors={vendors}
              classifications={classifications}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Vendor Detail Modal */}
      <VendorDetailModal
        vendorId={selectedVendor?.id || null}
        open={!!selectedVendor}
        onOpenChange={(open) => {
          if (!open) setSelectedVendor(null);
        }}
        onUpdate={loadData}
      />

      {/* Scoring Matrix Editor Modal */}
      {showScoring && scoringMatrix && (
        <ScoringMatrixEditor
          matrix={scoringMatrix}
          onClose={() => setShowScoring(false)}
          onSave={async (matrix) => {
            await saveScoringMatrix(matrix);
            setScoringMatrix(matrix);
            toast({ title: "Saved", description: "Scoring matrix updated." });
          }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
