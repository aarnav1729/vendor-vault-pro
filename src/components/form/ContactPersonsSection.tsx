import React from 'react';
import { Input } from '@/components/ui/input';
import { ContactPerson } from '@/types/vendor';
import { Users } from 'lucide-react';

interface Props {
  data: ContactPerson[];
  onChange: (data: ContactPerson[]) => void;
}

export const ContactPersonsSection: React.FC<Props> = ({ data, onChange }) => {
  const updateContact = (index: number, field: keyof ContactPerson, value: string) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="form-section animate-slide-up">
      <h2 className="form-section-title">
        <Users className="w-5 h-5 text-primary" />
        Vendor Contact Person Details
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border p-3 text-left font-medium w-12">Sr.</th>
              <th className="border border-border p-3 text-left font-medium">Name</th>
              <th className="border border-border p-3 text-left font-medium">Designation</th>
              <th className="border border-border p-3 text-left font-medium">Base Location</th>
              <th className="border border-border p-3 text-left font-medium">Contact Number</th>
              <th className="border border-border p-3 text-left font-medium">Email</th>
            </tr>
          </thead>
          <tbody>
            {data.map((contact, index) => (
              <tr key={index}>
                <td className="border border-border p-3 text-center font-medium bg-muted/30">
                  {index + 1}
                </td>
                <td className="border border-border p-1">
                  <Input
                    value={contact.name}
                    onChange={(e) => updateContact(index, 'name', e.target.value)}
                    placeholder="Contact name"
                    className="border-0 bg-transparent"
                  />
                </td>
                <td className="border border-border p-1">
                  <Input
                    value={contact.designation}
                    onChange={(e) => updateContact(index, 'designation', e.target.value)}
                    placeholder="Designation"
                    className="border-0 bg-transparent"
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
                <td className="border border-border p-1">
                  <Input
                    value={contact.contactNumber}
                    onChange={(e) => updateContact(index, 'contactNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Phone number"
                    className="border-0 bg-transparent"
                  />
                </td>
                <td className="border border-border p-1">
                  <Input
                    type="email"
                    value={contact.mailId}
                    onChange={(e) => updateContact(index, 'mailId', e.target.value)}
                    placeholder="Email address"
                    className="border-0 bg-transparent"
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
