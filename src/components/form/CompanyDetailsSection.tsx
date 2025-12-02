import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CompanyDetails, ORGANISATION_TYPES, COMPANY_ORIGINS, INDIAN_STATES, GOODS_SERVICES_CATEGORIES } from '@/types/vendor';
import { FileUpload } from '@/components/form/FileUpload';
import { Building2, MapPin, Package } from 'lucide-react';

interface Props {
  data: CompanyDetails;
  onChange: (data: CompanyDetails) => void;
}

export const CompanyDetailsSection: React.FC<Props> = ({ data, onChange }) => {
  const updateField = <K extends keyof CompanyDetails>(field: K, value: CompanyDetails[K]) => {
    onChange({ ...data, [field]: value });
  };

  const updateAddress = (field: keyof typeof data.registeredAddress, value: string) => {
    onChange({
      ...data,
      registeredAddress: { ...data.registeredAddress, [field]: value }
    });
  };

  const updateGoodsService = (index: number, field: 'category' | 'otherDescription', value: string) => {
    const updated = [...data.goodsAndServices];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, goodsAndServices: updated });
  };

  return (
    <div className="form-section animate-slide-up">
      <h2 className="form-section-title">
        <Building2 className="w-5 h-5 text-primary" />
        Company Details
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Company Name */}
        <div className="space-y-1.5">
          <label className="input-label input-required">Company Name</label>
          <Input
            value={data.companyName}
            onChange={(e) => updateField('companyName', e.target.value)}
            placeholder="Enter company name"
          />
        </div>

        {/* MD/CEO Name */}
        <div className="space-y-1.5">
          <label className="input-label input-required">Name of Managing Director/CEO</label>
          <Input
            value={data.managingDirectorName}
            onChange={(e) => updateField('managingDirectorName', e.target.value)}
            placeholder="Enter MD/CEO name"
          />
        </div>

        {/* Type of Organisation */}
        <div className="space-y-1.5">
          <label className="input-label">Type of Organisation</label>
          <Select value={data.typeOfOrganisation} onValueChange={(v) => updateField('typeOfOrganisation', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {ORGANISATION_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* CIN Number */}
        <div className="space-y-1.5">
          <label className="input-label input-required">CIN Number</label>
          <Input
            value={data.cinNumber}
            onChange={(e) => updateField('cinNumber', e.target.value)}
            placeholder="Enter CIN number"
          />
        </div>

        {/* Year of Establishment */}
        <div className="space-y-1.5">
          <label className="input-label input-required">Year of Establishment</label>
          <Input
            type="number"
            value={data.yearOfEstablishment}
            onChange={(e) => updateField('yearOfEstablishment', e.target.value)}
            placeholder="YYYY"
            min="1900"
            max={new Date().getFullYear()}
          />
        </div>

        {/* GST Number */}
        <div className="space-y-1.5">
          <label className="input-label input-required">GST Number</label>
          <Input
            value={data.gstNumber}
            onChange={(e) => updateField('gstNumber', e.target.value)}
            placeholder="Enter GST number"
          />
        </div>

        {/* Company Origin */}
        <div className="space-y-1.5">
          <label className="input-label input-required">Company Origin</label>
          <Select value={data.companyOrigin} onValueChange={(v) => updateField('companyOrigin', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select origin" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_ORIGINS.map(origin => (
                <SelectItem key={origin} value={origin}>{origin}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* PAN Number */}
        <div className="space-y-1.5">
          <label className="input-label input-required">PAN Number</label>
          <Input
            value={data.panNumber}
            onChange={(e) => updateField('panNumber', e.target.value.toUpperCase())}
            placeholder="Enter PAN number"
            maxLength={10}
          />
        </div>

        {/* Company Website */}
        <div className="space-y-1.5">
          <label className="input-label">Company Website</label>
          <Input
            type="url"
            value={data.companyWebsite || ''}
            onChange={(e) => updateField('companyWebsite', e.target.value)}
            placeholder="https://www.example.com"
          />
        </div>
      </div>

      {/* Registered Address */}
      <div className="mt-8 pt-6 border-t border-border">
        <h3 className="flex items-center gap-2 text-lg font-medium mb-4">
          <MapPin className="w-4 h-4 text-primary" />
          Registered Address
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
            <label className="input-label input-required">Address Line 1</label>
            <Input
              value={data.registeredAddress.line1}
              onChange={(e) => updateAddress('line1', e.target.value)}
              placeholder="Street address"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
            <label className="input-label">Address Line 2</label>
            <Input
              value={data.registeredAddress.line2}
              onChange={(e) => updateAddress('line2', e.target.value)}
              placeholder="Apartment, suite, etc."
            />
          </div>
          <div className="space-y-1.5">
            <label className="input-label input-required">PIN Code</label>
            <Input
              value={data.registeredAddress.pinCode}
              onChange={(e) => updateAddress('pinCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit PIN"
              maxLength={6}
            />
          </div>
          <div className="space-y-1.5">
            <label className="input-label input-required">District</label>
            <Input
              value={data.registeredAddress.district}
              onChange={(e) => updateAddress('district', e.target.value)}
              placeholder="Enter district"
            />
          </div>
          <div className="space-y-1.5">
            <label className="input-label input-required">State</label>
            <Select value={data.registeredAddress.state} onValueChange={(v) => updateAddress('state', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {INDIAN_STATES.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* MSME */}
      <div className="mt-8 pt-6 border-t border-border">
        <h3 className="text-lg font-medium mb-4">MSME Status</h3>
        <div className="space-y-4">
          <RadioGroup
            value={data.isMSME ? 'yes' : 'no'}
            onValueChange={(v) => updateField('isMSME', v === 'yes')}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="msme-yes" />
              <Label htmlFor="msme-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="msme-no" />
              <Label htmlFor="msme-no">No</Label>
            </div>
          </RadioGroup>

          {data.isMSME && (
            <div className="mt-4">
              <label className="input-label">MSME Certificate</label>
              <FileUpload
                files={data.msmeCertificate ? [data.msmeCertificate] : []}
                onChange={(files) => updateField('msmeCertificate', files[0] || undefined)}
                accept=".pdf,.jpg,.jpeg,.png"
                maxFiles={1}
              />
            </div>
          )}
        </div>
      </div>

      {/* Goods and Services */}
      <div className="mt-8 pt-6 border-t border-border">
        <h3 className="flex items-center gap-2 text-lg font-medium mb-4">
          <Package className="w-4 h-4 text-primary" />
          Goods and Services (Up to 3 categories)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((index) => (
            <div key={index} className="space-y-3">
              <div className="space-y-1.5">
                <label className="input-label">Category {index + 1}</label>
                <Select
                  value={data.goodsAndServices[index]?.category || ''}
                  onValueChange={(v) => updateGoodsService(index, 'category', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOODS_SERVICES_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {data.goodsAndServices[index]?.category === 'Others' && (
                <div className="space-y-1.5">
                  <label className="input-label">Specify Other</label>
                  <Input
                    value={data.goodsAndServices[index]?.otherDescription || ''}
                    onChange={(e) => updateGoodsService(index, 'otherDescription', e.target.value)}
                    placeholder="Specify category"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
