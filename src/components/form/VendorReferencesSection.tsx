import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VendorReference, REFERENCE_STATUS_OPTIONS } from '@/types/vendor';
import { FileCheck } from 'lucide-react';

interface Props {
  data: VendorReference[];
  onChange: (data: VendorReference[]) => void;
}

export const VendorReferencesSection: React.FC<Props> = ({ data, onChange }) => {
  const updateReference = (index: number, field: keyof VendorReference, value: string | number) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="form-section animate-slide-up">
      <h2 className="form-section-title">
        <FileCheck className="w-5 h-5 text-primary" />
        Vendor References
      </h2>
      
      <div className="bg-info/10 border border-info/30 rounded-lg p-4 mb-6">
        <p className="text-sm text-info">
          <strong>Note:</strong> Minimum 3 recent orders other than with Premier Energies Limited only with latest order first
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border p-3 text-left font-medium w-12">Sr.</th>
              <th className="border border-border p-3 text-left font-medium">Company Name</th>
              <th className="border border-border p-3 text-left font-medium">PO Date</th>
              <th className="border border-border p-3 text-left font-medium">Status</th>
              <th className="border border-border p-3 text-left font-medium">Contact Person</th>
              <th className="border border-border p-3 text-left font-medium">Contact No.</th>
              <th className="border border-border p-3 text-left font-medium">Email</th>
              <th className="border border-border p-3 text-left font-medium">Completion</th>
              <th className="border border-border p-3 text-left font-medium">PO Value (₹)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((ref, index) => (
              <tr key={index}>
                <td className="border border-border p-3 text-center font-medium bg-muted/30">
                  {index + 1}
                </td>
                <td className="border border-border p-1">
                  <Input
                    value={ref.companyName}
                    onChange={(e) => updateReference(index, 'companyName', e.target.value)}
                    placeholder="Company name"
                    className="border-0 bg-transparent"
                  />
                </td>
                <td className="border border-border p-1">
                  <Input
                    type="date"
                    value={ref.poDate}
                    onChange={(e) => updateReference(index, 'poDate', e.target.value)}
                    className="border-0 bg-transparent"
                  />
                </td>
                <td className="border border-border p-1">
                  <Select
                    value={ref.currentStatus}
                    onValueChange={(v) => updateReference(index, 'currentStatus', v)}
                  >
                    <SelectTrigger className="border-0 bg-transparent">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {REFERENCE_STATUS_OPTIONS.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="border border-border p-1">
                  <Input
                    value={ref.contactPersonName}
                    onChange={(e) => updateReference(index, 'contactPersonName', e.target.value)}
                    placeholder="Name"
                    className="border-0 bg-transparent"
                  />
                </td>
                <td className="border border-border p-1">
                  <Input
                    value={ref.contactNumber}
                    onChange={(e) => updateReference(index, 'contactNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Phone"
                    className="border-0 bg-transparent"
                  />
                </td>
                <td className="border border-border p-1">
                  <Input
                    type="email"
                    value={ref.mailId}
                    onChange={(e) => updateReference(index, 'mailId', e.target.value)}
                    placeholder="Email"
                    className="border-0 bg-transparent"
                  />
                </td>
                <td className="border border-border p-1">
                  <Input
                    type="date"
                    value={ref.completionDate}
                    onChange={(e) => updateReference(index, 'completionDate', e.target.value)}
                    className="border-0 bg-transparent"
                  />
                </td>
                <td className="border border-border p-1">
                  <Input
                    type="number"
                    value={ref.poValue || ''}
                    onChange={(e) => updateReference(index, 'poValue', parseFloat(e.target.value) || 0)}
                    placeholder="Amount"
                    className="border-0 bg-transparent"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Remarks section */}
      <div className="mt-6 space-y-4">
        <h4 className="font-medium">Remarks (Optional)</h4>
        {data.map((ref, index) => (
          ref.companyName && (
            <div key={index} className="space-y-1.5">
              <label className="text-sm text-muted-foreground">
                Remarks for {ref.companyName || `Reference ${index + 1}`}
              </label>
              <Textarea
                value={ref.remarks || ''}
                onChange={(e) => updateReference(index, 'remarks', e.target.value)}
                placeholder="Add any additional remarks..."
                rows={2}
              />
            </div>
          )
        ))}
      </div>
    </div>
  );
};
