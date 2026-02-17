import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  Trophy,
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Building2,
  HardHat,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

const GRADE_CONFIG: Record<
  string,
  { label: string; category: string; color: string; bg: string; financial: string }
> = {
  A: {
    label: "A",
    category: "Strategic Vendor",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    financial: "Strong financials",
  },
  B: {
    label: "B",
    category: "Approved Vendor",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    financial: "Acceptable",
  },
  C: {
    label: "C",
    category: "Conditional Vendor",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    financial: "Financial watchlist",
  },
  D: {
    label: "D",
    category: "High-Risk Vendor",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    financial: "Avoid / short-term only",
  },
};

const VendorRanking: React.FC = () => {
  const [rankings, setRankings] = useState<any[]>([]);
  const [filteredRankings, setFilteredRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortField, setSortField] = useState<string>("totalScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.verified || !isAdmin) {
      navigate("/");
      return;
    }
    loadRankings();
  }, [user, isAdmin]);

  const loadRankings = async () => {
    try {
      const res = await fetch("/api/admin/rankings", { credentials: "include" });
      const data = await res.json();
      if (data?.ok) {
        setRankings(data.rankings || []);
      }
    } catch (e: any) {
      toast({
        title: "Failed to load rankings",
        description: String(e?.message || e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...rankings];

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.companyName || "").toLowerCase().includes(q) ||
          (r.email || "").toLowerCase().includes(q)
      );
    }

    if (gradeFilter !== "all") {
      filtered = filtered.filter((r) => r.finalGrade === gradeFilter);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((r) => r.vendorType === typeFilter);
    }

    filtered.sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "desc" ? bVal - aVal : aVal - bVal;
      }
      return sortDir === "desc"
        ? String(bVal).localeCompare(String(aVal))
        : String(aVal).localeCompare(String(bVal));
    });

    setFilteredRankings(filtered);
  }, [rankings, search, gradeFilter, typeFilter, sortField, sortDir]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "desc" ? (
      <ChevronDown className="w-3 h-3" />
    ) : (
      <ChevronUp className="w-3 h-3" />
    );
  };

  const gradeStats = {
    A: rankings.filter((r) => r.finalGrade === "A").length,
    B: rankings.filter((r) => r.finalGrade === "B").length,
    C: rankings.filter((r) => r.finalGrade === "C").length,
    D: rankings.filter((r) => r.finalGrade === "D").length,
    ungraded: rankings.filter((r) => !r.finalGrade).length,
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <h1 className="font-semibold text-lg">Vendor Rankings & Grades</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Grade summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(["A", "B", "C", "D"] as const).map((g) => {
            const cfg = GRADE_CONFIG[g];
            return (
              <div
                key={g}
                className={`rounded-xl border p-4 cursor-pointer transition-all ${cfg.bg} ${
                  gradeFilter === g ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setGradeFilter(gradeFilter === g ? "all" : g)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-2xl font-black ${cfg.color}`}>{g}</span>
                  <span className={`text-2xl font-bold ${cfg.color}`}>
                    {gradeStats[g]}
                  </span>
                </div>
                <p className={`text-xs font-medium ${cfg.color}`}>{cfg.category}</p>
              </div>
            );
          })}
          <div
            className={`rounded-xl border p-4 cursor-pointer transition-all bg-gray-50 border-gray-200 ${
              gradeFilter === "ungraded" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() =>
              setGradeFilter(gradeFilter === "ungraded" ? "all" : "ungraded")
            }
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xl font-black text-gray-400">?</span>
              <span className="text-2xl font-bold text-gray-500">
                {gradeStats.ungraded}
              </span>
            </div>
            <p className="text-xs font-medium text-gray-500">Ungraded</p>
          </div>
        </div>

        {/* Grade Matrix Legend */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-medium mb-3 text-sm">Grading Matrix</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1.5 px-2 font-medium">Score</th>
                  <th className="text-left py-1.5 px-2 font-medium">Grade</th>
                  <th className="text-left py-1.5 px-2 font-medium">Category</th>
                  <th className="text-left py-1.5 px-2 font-medium">Financial Gate</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { score: "≥ 85", grade: "A", cat: "Strategic Vendor", fin: "Strong financials" },
                  { score: "70 – 84", grade: "B", cat: "Approved Vendor", fin: "Acceptable" },
                  { score: "55 – 69", grade: "C", cat: "Conditional Vendor", fin: "Financial watchlist" },
                  { score: "< 55", grade: "D", cat: "High-Risk Vendor", fin: "Avoid / short-term only" },
                ].map((row) => {
                  const cfg = GRADE_CONFIG[row.grade];
                  return (
                    <tr key={row.grade} className="border-b border-border/50">
                      <td className="py-1.5 px-2">{row.score}</td>
                      <td className="py-1.5 px-2">
                        <span className={`font-bold ${cfg.color}`}>{row.grade}</span>
                      </td>
                      <td className="py-1.5 px-2">{row.cat}</td>
                      <td className="py-1.5 px-2 text-muted-foreground">{row.fin}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Score = Site (45%) + Procurement (30%) + Financial (25%). Each parameter rated 1–5, score = (rating/5) × weight.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by company or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Grades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              <SelectItem value="A">Grade A</SelectItem>
              <SelectItem value="B">Grade B</SelectItem>
              <SelectItem value="C">Grade C</SelectItem>
              <SelectItem value="D">Grade D</SelectItem>
              <SelectItem value="ungraded">Ungraded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="capex">Capex</SelectItem>
              <SelectItem value="opex">Opex</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Rankings Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-3 px-3 font-medium w-12">#</th>
                  <th className="text-left py-3 px-3 font-medium">Vendor</th>
                  <th
                    className="text-center py-3 px-2 font-medium cursor-pointer hover:text-primary"
                    onClick={() => toggleSort("siteScore")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <HardHat className="w-3.5 h-3.5" />
                      Site
                      <SortIcon field="siteScore" />
                    </div>
                    <span className="text-xs font-normal text-muted-foreground">(45%)</span>
                  </th>
                  <th
                    className="text-center py-3 px-2 font-medium cursor-pointer hover:text-primary"
                    onClick={() => toggleSort("procurementScore")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Proc.
                      <SortIcon field="procurementScore" />
                    </div>
                    <span className="text-xs font-normal text-muted-foreground">(30%)</span>
                  </th>
                  <th
                    className="text-center py-3 px-2 font-medium cursor-pointer hover:text-primary"
                    onClick={() => toggleSort("financialScore")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Fin.
                      <SortIcon field="financialScore" />
                    </div>
                    <span className="text-xs font-normal text-muted-foreground">(25%)</span>
                  </th>
                  <th
                    className="text-center py-3 px-2 font-medium cursor-pointer hover:text-primary"
                    onClick={() => toggleSort("totalScore")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Total
                      <SortIcon field="totalScore" />
                    </div>
                    <span className="text-xs font-normal text-muted-foreground">(/100)</span>
                  </th>
                  <th className="text-center py-3 px-3 font-medium">Grade</th>
                  <th className="text-left py-3 px-3 font-medium">Category</th>
                </tr>
              </thead>
              <tbody>
                {filteredRankings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground">
                      No vendors match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredRankings.map((r, idx) => {
                    const grade = r.finalGrade;
                    const cfg = grade ? GRADE_CONFIG[grade] : null;
                    const isOverride =
                      r.adminOverrideGrade && r.adminOverrideGrade !== r.computedGrade;

                    return (
                      <tr key={r.vendorId} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-3 font-medium text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-medium">{r.companyName || "—"}</p>
                          <p className="text-xs text-muted-foreground">{r.email}</p>
                          {r.vendorType && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {r.vendorType}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center font-mono">
                          {r.siteScore > 0 ? r.siteScore.toFixed(1) : "—"}
                        </td>
                        <td className="py-3 px-2 text-center font-mono">
                          {r.procurementScore > 0 ? r.procurementScore.toFixed(1) : "—"}
                        </td>
                        <td className="py-3 px-2 text-center font-mono">
                          {r.financialScore > 0 ? r.financialScore.toFixed(1) : "—"}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="font-bold text-lg">
                            {r.totalScore > 0 ? r.totalScore.toFixed(1) : "—"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {cfg ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black border ${cfg.bg} ${cfg.color}`}
                              >
                                {grade}
                              </span>
                              {isOverride && (
                                <span className="text-[10px] text-muted-foreground">
                                  override
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {cfg ? (
                            <div>
                              <p className={`text-sm font-medium ${cfg.color}`}>
                                {cfg.category}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {cfg.financial}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Not graded
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorRanking;