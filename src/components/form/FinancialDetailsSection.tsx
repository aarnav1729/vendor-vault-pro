import React from 'react';
import { Input } from '@/components/ui/input';
import { FinancialDetails } from '@/types/vendor';
import { FileUpload } from '@/components/form/FileUpload';
import { TrendingUp, Users } from 'lucide-react';

interface Props {
  data: FinancialDetails;
  onChange: (data: FinancialDetails) => void;
}

const FISCAL_YEARS = ['fy2022_23', 'fy2023_24', 'fy2024_25', 'fy2025_26'] as const;
const FY_LABELS: Record<string, string> = {
  fy2022_23: 'FY 2022-23',
  fy2023_24: 'FY 2023-24',
  fy2024_25: 'FY 2024-25',
  fy2025_26: 'FY 2025-26',
};

export const FinancialDetailsSection: React.FC<Props> = ({ data, onChange }) => {
  const updateTurnover = (fy: keyof typeof data.annualTurnover, value: number) => {
    onChange({
      ...data,
      annualTurnover: { ...data.annualTurnover, [fy]: value }
    });
  };

  const updateEmployment = (
    fy: keyof typeof data.employmentDetails,
    field: 'direct' | 'indirect',
    value: number
  ) => {
    const current = data.employmentDetails[fy];
    const updated = { ...current, [field]: value };
    updated.total = updated.direct + updated.indirect;
    
    onChange({
      ...data,
      employmentDetails: { ...data.employmentDetails, [fy]: updated }
    });
  };

  const formatCurrency = (value: number) => {
    if (!value) return '';
    return new Intl.NumberFormat('en-IN').format(value);
  };

  return (
    <div className="form-section animate-slide-up">
      <h2 className="form-section-title">
        <TrendingUp className="w-5 h-5 text-primary" />
        Vendor Financial and Employment Details
      </h2>

      {/* Annual Turnover Table */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">Annual Turnover Details (INR)</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-3 text-left font-medium">Financial Year</th>
                <th className="border border-border p-3 text-left font-medium">Turnover (₹)</th>
              </tr>
            </thead>
            <tbody>
              {FISCAL_YEARS.map((fy) => (
                <tr key={fy}>
                  <td className="border border-border p-3 font-medium">{FY_LABELS[fy]}</td>
                  <td className="border border-border p-2">
                    <Input
                      type="number"
                      value={data.annualTurnover[fy] || ''}
                      onChange={(e) => updateTurnover(fy, parseFloat(e.target.value) || 0)}
                      placeholder="Enter amount"
                      className="border-0 bg-transparent"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <label className="input-label">Supporting Documents</label>
          <FileUpload
            files={data.annualTurnover.attachments}
            onChange={(files) => onChange({
              ...data,
              annualTurnover: { ...data.annualTurnover, attachments: files }
            })}
            accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx"
            maxFiles={10}
          />
        </div>
      </div>

      {/* Employment Details Table */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-medium mb-4">
          <Users className="w-4 h-4 text-primary" />
          Total Employment
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-3 text-left font-medium">Financial Year</th>
                <th className="border border-border p-3 text-left font-medium">Direct</th>
                <th className="border border-border p-3 text-left font-medium">Indirect</th>
                <th className="border border-border p-3 text-left font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {FISCAL_YEARS.map((fy) => (
                <tr key={fy}>
                  <td className="border border-border p-3 font-medium">{FY_LABELS[fy]}</td>
                  <td className="border border-border p-2">
                    <Input
                      type="number"
                      value={data.employmentDetails[fy].direct || ''}
                      onChange={(e) => updateEmployment(fy, 'direct', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="border-0 bg-transparent"
                    />
                  </td>
                  <td className="border border-border p-2">
                    <Input
                      type="number"
                      value={data.employmentDetails[fy].indirect || ''}
                      onChange={(e) => updateEmployment(fy, 'indirect', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="border-0 bg-transparent"
                    />
                  </td>
                  <td className="border border-border p-3 bg-muted/50 font-medium">
                    {formatCurrency(data.employmentDetails[fy].total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
