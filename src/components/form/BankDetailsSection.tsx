import React from 'react';
import { Input } from '@/components/ui/input';
import { BankDetails } from '@/types/vendor';
import { Landmark } from 'lucide-react';

interface Props {
  data: BankDetails;
  onChange: (data: BankDetails) => void;
}

export const BankDetailsSection: React.FC<Props> = ({ data, onChange }) => {
  const updateField = <K extends keyof BankDetails>(field: K, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="form-section animate-slide-up">
      <h2 className="form-section-title">
        <Landmark className="w-5 h-5 text-primary" />
        Vendor Bank Account Details
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-1.5">
          <label className="input-label input-required">Name of the Bank</label>
          <Input
            value={data.bankName}
            onChange={(e) => updateField('bankName', e.target.value)}
            placeholder="Enter bank name"
          />
        </div>

        <div className="space-y-1.5">
          <label className="input-label input-required">Branch</label>
          <Input
            value={data.branch}
            onChange={(e) => updateField('branch', e.target.value)}
            placeholder="Enter branch name"
          />
        </div>

        <div className="space-y-1.5">
          <label className="input-label input-required">Bank Account Number</label>
          <Input
            value={data.accountNumber}
            onChange={(e) => updateField('accountNumber', e.target.value.replace(/\D/g, ''))}
            placeholder="Enter account number"
          />
        </div>

        <div className="space-y-1.5">
          <label className="input-label input-required">IFSC Code</label>
          <Input
            value={data.ifscCode}
            onChange={(e) => updateField('ifscCode', e.target.value.toUpperCase())}
            placeholder="e.g., HDFC0001234"
            maxLength={11}
          />
        </div>

        <div className="space-y-1.5">
          <label className="input-label">SWIFT Code</label>
          <Input
            value={data.swiftCode}
            onChange={(e) => updateField('swiftCode', e.target.value.toUpperCase())}
            placeholder="Enter SWIFT code (optional)"
            maxLength={11}
          />
        </div>
      </div>
    </div>
  );
};
