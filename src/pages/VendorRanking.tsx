import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { getAllVendors, getAllClassifications, getScoringMatrix } from '@/lib/db';
import { VendorFormData, VendorClassification, ScoringMatrix, CAPEX_BANDS } from '@/types/vendor';
import { 
  Trophy, ArrowLeft, Medal, Star, TrendingUp, Building2, Filter
} from 'lucide-react';

const VendorRanking: React.FC = () => {
  const [vendors, setVendors] = useState<VendorFormData[]>([]);
  const [classifications, setClassifications] = useState<Map<string, VendorClassification>>(new Map());
  const [scoringMatrix, setScoringMatrix] = useState<ScoringMatrix | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterBand, setFilterBand] = useState<string>('all');
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.verified || !isAdmin) {
      navigate('/');
      return;
    }
    loadData();
  }, [user, isAdmin]);

  const loadData = async () => {
    const [vendorList, classificationList, matrix] = await Promise.all([
      getAllVendors(),
      getAllClassifications(),
      getScoringMatrix(),
    ]);
    
    setVendors(vendorList);
    const classMap = new Map<string, VendorClassification>();
    classificationList.forEach(c => classMap.set(c.vendorId, c));
    setClassifications(classMap);
    setScoringMatrix(matrix);
  };

  const rankedVendors = useMemo(() => {
    let result = vendors.filter(v => {
      const classification = classifications.get(v.id!);
      return classification && classification.totalScore > 0;
    });

    // Apply filters
    if (filterType !== 'all') {
      result = result.filter(v => classifications.get(v.id!)?.vendorType === filterType);
    }
    if (filterBand !== 'all') {
      result = result.filter(v => classifications.get(v.id!)?.capexBand === filterBand);
    }

    // Sort by total score descending
    return result.sort((a, b) => {
      const scoreA = classifications.get(a.id!)?.totalScore || 0;
      const scoreB = classifications.get(b.id!)?.totalScore || 0;
      return scoreB - scoreA;
    });
  }, [vendors, classifications, filterType, filterBand]);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
    if (index === 2) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center font-bold text-muted-foreground">#{index + 1}</span>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-info';
    if (score >= 40) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 rounded-lg bg-warning flex items-center justify-center">
                <Trophy className="w-6 h-6 text-warning-foreground" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">Vendor Rankings</h1>
                <p className="text-sm text-muted-foreground">Based on scoring matrix</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Scoring Matrix Summary */}
        {scoringMatrix && (
          <div className="bg-card rounded-xl border border-border p-4 mb-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-warning" />
              Current Scoring Weights
            </h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Company:</span>
                <Badge variant="outline">{scoringMatrix.companyDetailsWeight}%</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Financial:</span>
                <Badge variant="outline">{scoringMatrix.financialDetailsWeight}%</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Bank:</span>
                <Badge variant="outline">{scoringMatrix.bankDetailsWeight}%</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">References:</span>
                <Badge variant="outline">{scoringMatrix.referencesWeight}%</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Documents:</span>
                <Badge variant="outline">{scoringMatrix.documentsWeight}%</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <Filter className="w-4 h-4 text-muted-foreground" />
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
            <Select value={filterBand} onValueChange={setFilterBand}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Capex Band" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bands</SelectItem>
                {CAPEX_BANDS.map(band => (
                  <SelectItem key={band.value} value={band.value!}>{band.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">
              {rankedVendors.length} vendors ranked
            </span>
          </div>
        </div>

        {/* Rankings */}
        <div className="space-y-3">
          {rankedVendors.length === 0 ? (
            <div className="bg-card rounded-xl p-12 text-center border border-border">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Ranked Vendors</h3>
              <p className="text-muted-foreground">Score vendors in the admin dashboard to see rankings here.</p>
            </div>
          ) : (
            rankedVendors.map((vendor, index) => {
              const classification = classifications.get(vendor.id!);
              
              return (
                <div 
                  key={vendor.id} 
                  className={`bg-card rounded-xl border p-4 transition-all ${
                    index < 3 ? 'border-warning/50 shadow-md' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {getRankIcon(index)}
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {vendor.companyDetails.companyName || 'Unnamed Vendor'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{vendor.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {classification?.vendorType && (
                        <Badge variant={classification.vendorType === 'capex' ? 'default' : 'secondary'}>
                          {classification.vendorType.toUpperCase()}
                        </Badge>
                      )}
                      {classification?.capexBand && (
                        <span className="text-sm text-muted-foreground">
                          {CAPEX_BANDS.find(b => b.value === classification.capexBand)?.label}
                        </span>
                      )}
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${getScoreColor(classification?.totalScore || 0)}`}>
                          {classification?.totalScore || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Score</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Score breakdown */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="grid grid-cols-5 gap-4 text-center">
                      <div>
                        <p className="text-lg font-semibold">{classification?.scores.companyDetails || 0}</p>
                        <p className="text-xs text-muted-foreground">Company</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{classification?.scores.financialDetails || 0}</p>
                        <p className="text-xs text-muted-foreground">Financial</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{classification?.scores.bankDetails || 0}</p>
                        <p className="text-xs text-muted-foreground">Bank</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{classification?.scores.references || 0}</p>
                        <p className="text-xs text-muted-foreground">References</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{classification?.scores.documents || 0}</p>
                        <p className="text-xs text-muted-foreground">Documents</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorRanking;
