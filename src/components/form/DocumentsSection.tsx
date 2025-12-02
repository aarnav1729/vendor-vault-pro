import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { VendorDocument } from '@/types/vendor';
import { FileUpload } from '@/components/form/FileUpload';
import { FolderOpen, Plus, Trash2 } from 'lucide-react';

interface Props {
  data: VendorDocument[];
  onChange: (data: VendorDocument[]) => void;
}

export const DocumentsSection: React.FC<Props> = ({ data, onChange }) => {
  const [newDocName, setNewDocName] = useState('');

  const updateDocument = (index: number, field: keyof VendorDocument, value: any) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addDocument = () => {
    if (!newDocName.trim()) return;
    onChange([...data, {
      docName: newDocName.trim(),
      attached: false,
      files: [],
      remarks: '',
    }]);
    setNewDocName('');
  };

  const removeDocument = (index: number) => {
    const updated = data.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="form-section animate-slide-up">
      <h2 className="form-section-title">
        <FolderOpen className="w-5 h-5 text-primary" />
        Vendor Document List
      </h2>

      <div className="space-y-4">
        {data.map((doc, index) => (
          <div 
            key={index} 
            className="border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground w-8">
                  {index + 1}.
                </span>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={doc.attached}
                    onCheckedChange={(checked) => updateDocument(index, 'attached', !!checked)}
                    id={`doc-${index}`}
                  />
                  <label 
                    htmlFor={`doc-${index}`}
                    className="font-medium cursor-pointer"
                  >
                    {doc.docName}
                  </label>
                </div>
              </div>
              {index >= 10 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeDocument(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            {doc.attached && (
              <div className="ml-11 space-y-3">
                <FileUpload
                  files={doc.files}
                  onChange={(files) => updateDocument(index, 'files', files)}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  maxFiles={5}
                />
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Remarks (if any)</label>
                  <Input
                    value={doc.remarks || ''}
                    onChange={(e) => updateDocument(index, 'remarks', e.target.value)}
                    placeholder="Add any remarks..."
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add custom document */}
        <div className="border-2 border-dashed border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Input
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              placeholder="Enter document name to add..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && addDocument()}
            />
            <Button onClick={addDocument} disabled={!newDocName.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Document
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
