import React from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ContactPerson } from '@/types/vendor';
import { Users, AlertCircle, Star } from 'lucide-react';

interface Props {
  data: ContactPerson[];
  onChange: (data: ContactPerson[]) => void;
  showErrors?: boolean;
}

export const ContactPersonsSection: React.FC<Props> = ({ data, onChange, showErrors = false }) => {
  const updateContact = (index: number, field: keyof ContactPerson, value: string | boolean) => {
    const updated = [...data];
    
    // If setting a new primary, unset others
    if (field === 'isPrimary' && value === true) {
      updated.forEach((contact, i) => {
        updated[i] = { ...contact, isPrimary: i === index };
      });
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    
    onChange(updated);
  };

  const isContactComplete = (contact: ContactPerson) => {
    return contact.name && contact.designation && contact.contactNumber && contact.mailId;
  };

  const getFilledContacts = () => data.filter(isContactComplete);
  const hasPrimary = () => data.some(c => c.isPrimary && isContactComplete(c));
  
  const filledCount = getFilledContacts().length;
  const hasMinContacts = filledCount >= 2;
  const hasPrimaryContact = hasPrimary();

  const isRowError = (contact: ContactPerson, index: number) => {
    if (!showErrors) return false;
    // First two rows are mandatory
    if (index < 2 && !isContactComplete(contact)) return true;
    return false;
  };

  return (
    <div className="form-section animate-slide-up">
      <h2 className="form-section-title">
        <Users className="w-5 h-5 text-primary" />
        Vendor Contact Person Details
        <span className="text-destructive ml-1">*</span>
      </h2>

      <div className="mb-4 space-y-2">
        <p className="text-sm text-muted-foreground">
          Minimum 2 contact persons are required. At least one must be marked as primary.
        </p>
        
        {showErrors && !hasMinContacts && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Please provide at least 2 complete contact persons</span>
          </div>
        )}
        
        {showErrors && hasMinContacts && !hasPrimaryContact && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Please mark at least one contact as primary</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border p-3 text-left font-medium w-12">Sr.</th>
              <th className="border border-border p-3 text-left font-medium w-16">Primary</th>
              <th className="border border-border p-3 text-left font-medium">Name *</th>
              <th className="border border-border p-3 text-left font-medium">Designation *</th>
              <th className="border border-border p-3 text-left font-medium">Base Location</th>
              <th className="border border-border p-3 text-left font-medium">Contact Number *</th>
              <th className="border border-border p-3 text-left font-medium">Email *</th>
            </tr>
          </thead>
          <tbody>
            {data.map((contact, index) => (
              <tr 
                key={index}
                className={isRowError(contact, index) ? 'bg-destructive/5' : ''}
              >
                <td className="border border-border p-3 text-center font-medium bg-muted/30">
                  <div className="flex items-center justify-center gap-1">
                    {index + 1}
                    {index < 2 && <span className="text-destructive text-xs">*</span>}
                  </div>
                </td>
                <td className="border border-border p-3 text-center">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={contact.isPrimary}
                      onCheckedChange={(checked) => updateContact(index, 'isPrimary', !!checked)}
                      className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    />
                    {contact.isPrimary && (
                      <Star className="w-3 h-3 text-amber-500 ml-1 fill-amber-500" />
                    )}
                  </div>
                </td>
                <td className={`border border-border p-1 ${isRowError(contact, index) && !contact.name ? 'bg-destructive/10' : ''}`}>
                  <Input
                    value={contact.name}
                    onChange={(e) => updateContact(index, 'name', e.target.value)}
                    placeholder="Contact name"
                    className={`border-0 bg-transparent ${isRowError(contact, index) && !contact.name ? 'placeholder:text-destructive' : ''}`}
                  />
                </td>
                <td className={`border border-border p-1 ${isRowError(contact, index) && !contact.designation ? 'bg-destructive/10' : ''}`}>
                  <Input
                    value={contact.designation}
                    onChange={(e) => updateContact(index, 'designation', e.target.value)}
                    placeholder="Designation"
                    className={`border-0 bg-transparent ${isRowError(contact, index) && !contact.designation ? 'placeholder:text-destructive' : ''}`}
                  />
                </td>
                <td className="border border-border p-1">
                  <Input
                    value={contact.baseLocation}
                    onChange={(e) => updateContact(index, 'baseLocation', e.target.value)}
                    placeholder="Location"
                    className="border-0 bg-transparent"
                  />
                </td>
                <td className={`border border-border p-1 ${isRowError(contact, index) && !contact.contactNumber ? 'bg-destructive/10' : ''}`}>
                  <Input
                    value={contact.contactNumber}
                    onChange={(e) => updateContact(index, 'contactNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Phone number"
                    className={`border-0 bg-transparent ${isRowError(contact, index) && !contact.contactNumber ? 'placeholder:text-destructive' : ''}`}
                  />
                </td>
                <td className={`border border-border p-1 ${isRowError(contact, index) && !contact.mailId ? 'bg-destructive/10' : ''}`}>
                  <Input
                    type="email"
                    value={contact.mailId}
                    onChange={(e) => updateContact(index, 'mailId', e.target.value)}
                    placeholder="Email address"
                    className={`border-0 bg-transparent ${isRowError(contact, index) && !contact.mailId ? 'placeholder:text-destructive' : ''}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
