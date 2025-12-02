import React, { useState, useMemo } from 'react';
import { VendorFormData, VendorClassification, CAPEX_BANDS } from '@/types/vendor';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, TrendingUp, PieChart as PieChartIcon, BarChart2, Users
} from 'lucide-react';

interface AnalyticsChartsProps {
  vendors: VendorFormData[];
  classifications: Map<string, VendorClassification>;
}

type DrillDownLevel = 'overview' | 'type' | 'subtype' | 'band';
type DrillDownFilter = {
  type?: 'capex' | 'opex';
  subtype?: string;
  band?: string;
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--destructive))'];

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ vendors, classifications }) => {
  const [drillLevel, setDrillLevel] = useState<DrillDownLevel>('overview');
  const [drillFilter, setDrillFilter] = useState<DrillDownFilter>({});

  const filteredVendors = useMemo(() => {
    let result = vendors;
    
    if (drillFilter.type) {
      result = result.filter(v => classifications.get(v.id!)?.vendorType === drillFilter.type);
    }
    if (drillFilter.subtype) {
      result = result.filter(v => {
        const c = classifications.get(v.id!);
        return c?.opexSubType === drillFilter.subtype || c?.capexSubType === drillFilter.subtype;
      });
    }
    if (drillFilter.band) {
      result = result.filter(v => classifications.get(v.id!)?.capexBand === drillFilter.band);
    }
    
    return result;
  }, [vendors, classifications, drillFilter]);

  // Overview data
  const overviewData = useMemo(() => {
    const capex = vendors.filter(v => classifications.get(v.id!)?.vendorType === 'capex').length;
    const opex = vendors.filter(v => classifications.get(v.id!)?.vendorType === 'opex').length;
    const unclassified = vendors.length - capex - opex;
    
    return [
      { name: 'Capex', value: capex, color: COLORS[0] },
      { name: 'Opex', value: opex, color: COLORS[1] },
      { name: 'Unclassified', value: unclassified, color: COLORS[5] },
    ];
  }, [vendors, classifications]);

  // Type breakdown data
  const typeBreakdownData = useMemo(() => {
    if (drillFilter.type === 'capex') {
      const civil = filteredVendors.filter(v => classifications.get(v.id!)?.capexSubType === 'civil').length;
      const machinery = filteredVendors.filter(v => classifications.get(v.id!)?.capexSubType === 'plant_machinery').length;
      const utilities = filteredVendors.filter(v => classifications.get(v.id!)?.capexSubType === 'utilities').length;
      const service = filteredVendors.filter(v => classifications.get(v.id!)?.capexSubType === 'service').length;
      
      return [
        { name: 'Civil', value: civil, subtype: 'civil' },
        { name: 'Plant & Machinery', value: machinery, subtype: 'plant_machinery' },
        { name: 'Utilities', value: utilities, subtype: 'utilities' },
        { name: 'Service', value: service, subtype: 'service' },
      ];
    } else if (drillFilter.type === 'opex') {
      const rawMaterial = filteredVendors.filter(v => classifications.get(v.id!)?.opexSubType === 'raw_material').length;
      const consumables = filteredVendors.filter(v => classifications.get(v.id!)?.opexSubType === 'consumables').length;
      const service = filteredVendors.filter(v => classifications.get(v.id!)?.opexSubType === 'service').length;
      
      return [
        { name: 'Raw Material', value: rawMaterial, subtype: 'raw_material' },
        { name: 'Consumables', value: consumables, subtype: 'consumables' },
        { name: 'Service', value: service, subtype: 'service' },
      ];
    }
    return [];
  }, [filteredVendors, classifications, drillFilter]);

  // Capex band distribution
  const bandDistributionData = useMemo(() => {
    return CAPEX_BANDS.map(band => ({
      name: band.label,
      value: filteredVendors.filter(v => classifications.get(v.id!)?.capexBand === band.value).length,
      band: band.value,
    })).filter(d => d.value > 0);
  }, [filteredVendors, classifications]);

  // Completion status data
  const completionData = useMemo(() => {
    const complete = filteredVendors.filter(v => v.completionPercentage === 100).length;
    const partial = filteredVendors.filter(v => v.completionPercentage >= 50 && v.completionPercentage < 100).length;
    const low = filteredVendors.filter(v => v.completionPercentage < 50).length;
    
    return [
      { name: 'Complete (100%)', value: complete, color: COLORS[4] },
      { name: 'Partial (50-99%)', value: partial, color: COLORS[3] },
      { name: 'Low (<50%)', value: low, color: COLORS[5] },
    ];
  }, [filteredVendors]);

  // Score distribution
  const scoreDistributionData = useMemo(() => {
    const ranges = [
      { min: 0, max: 20, label: '0-20' },
      { min: 21, max: 40, label: '21-40' },
      { min: 41, max: 60, label: '41-60' },
      { min: 61, max: 80, label: '61-80' },
      { min: 81, max: 100, label: '81-100' },
    ];
    
    return ranges.map(range => ({
      name: range.label,
      count: filteredVendors.filter(v => {
        const score = classifications.get(v.id!)?.totalScore || 0;
        return score >= range.min && score <= range.max;
      }).length,
    }));
  }, [filteredVendors, classifications]);

  // Monthly registration trend (simulated based on createdAt)
  const registrationTrendData = useMemo(() => {
    const monthCounts: { [key: string]: number } = {};
    
    filteredVendors.forEach(v => {
      const date = new Date(v.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    });
    
    return Object.entries(monthCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, count]) => ({ month, count }));
  }, [filteredVendors]);

  const handleDrillDown = (type: 'capex' | 'opex') => {
    setDrillLevel('type');
    setDrillFilter({ type });
  };

  const handleSubtypeDrill = (subtype: string) => {
    setDrillLevel('subtype');
    setDrillFilter({ ...drillFilter, subtype });
  };

  const handleBandDrill = (band: string) => {
    setDrillLevel('band');
    setDrillFilter({ ...drillFilter, band });
  };

  const handleBack = () => {
    if (drillLevel === 'band') {
      setDrillLevel('subtype');
      setDrillFilter({ ...drillFilter, band: undefined });
    } else if (drillLevel === 'subtype') {
      setDrillLevel('type');
      setDrillFilter({ ...drillFilter, subtype: undefined });
    } else if (drillLevel === 'type') {
      setDrillLevel('overview');
      setDrillFilter({});
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label || payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            Count: <span className="font-semibold text-foreground">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb / Back button */}
      {drillLevel !== 'overview' && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            {drillFilter.type && (
              <Badge variant="outline">{drillFilter.type.toUpperCase()}</Badge>
            )}
            {drillFilter.subtype && (
              <Badge variant="outline">{drillFilter.subtype.replace('_', ' ')}</Badge>
            )}
            {drillFilter.band && (
              <Badge variant="outline">{CAPEX_BANDS.find(b => b.value === drillFilter.band)?.label}</Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground ml-auto">
            Showing {filteredVendors.length} vendors
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendor Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary" />
              {drillLevel === 'overview' ? 'Vendor Type Distribution' : 'Sub-Type Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={drillLevel === 'overview' ? overviewData : typeBreakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={(data) => {
                    if (drillLevel === 'overview' && (data.name === 'Capex' || data.name === 'Opex')) {
                      handleDrillDown(data.name.toLowerCase() as 'capex' | 'opex');
                    } else if (drillLevel === 'type' && data.subtype) {
                      handleSubtypeDrill(data.subtype);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {(drillLevel === 'overview' ? overviewData : typeBreakdownData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            {drillLevel === 'overview' && (
              <p className="text-xs text-center text-muted-foreground mt-2">Click on Capex/Opex to drill down</p>
            )}
          </CardContent>
        </Card>

        {/* Completion Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              Completion Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={completionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {completionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Capex Band Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-info" />
              Capex Band Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bandDistributionData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }} 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  className="fill-muted-foreground"
                />
                <YAxis className="fill-muted-foreground" />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  onClick={(data) => data.band && handleBandDrill(data.band)}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-center text-muted-foreground mt-2">Click on a bar to filter by band</p>
          </CardContent>
        </Card>

        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-warning" />
              Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={scoreDistributionData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="fill-muted-foreground" />
                <YAxis className="fill-muted-foreground" />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--warning))" 
                  fill="hsl(var(--warning) / 0.3)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Registration Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Registration Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={registrationTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="fill-muted-foreground" />
                <YAxis className="fill-muted-foreground" />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--accent))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
