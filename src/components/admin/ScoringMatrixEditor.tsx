import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScoringMatrix } from '@/types/vendor';
import { Save, Settings } from 'lucide-react';

interface Props {
  matrix: ScoringMatrix;
  onClose: () => void;
  onSave: (matrix: ScoringMatrix) => Promise<void>;
}

export const ScoringMatrixEditor: React.FC<Props> = ({ matrix, onClose, onSave }) => {
  const [localMatrix, setLocalMatrix] = useState<ScoringMatrix>({ ...matrix });
  const [saving, setSaving] = useState(false);

  const totalWeight = 
    localMatrix.companyDetailsWeight +
    localMatrix.financialDetailsWeight +
    localMatrix.bankDetailsWeight +
    localMatrix.referencesWeight +
    localMatrix.documentsWeight;

  const handleSave = async () => {
    setSaving(true);
    await onSave(localMatrix);
    setSaving(false);
    onClose();
  };

  const updateWeight = (field: keyof ScoringMatrix, value: number) => {
    setLocalMatrix(prev => ({ ...prev, [field]: value }));
  };

  const weights = [
    { key: 'companyDetailsWeight', label: 'Company Details' },
    { key: 'financialDetailsWeight', label: 'Financial Details' },
    { key: 'bankDetailsWeight', label: 'Bank Details' },
    { key: 'referencesWeight', label: 'References' },
    { key: 'documentsWeight', label: 'Documents' },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Scoring Matrix Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <p className="text-sm text-muted-foreground">
            Configure the weight percentage for each category. Weights should sum to 100%.
          </p>

          {weights.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{label} (%)</Label>
              <Input
                id={key}
                type="number"
                min="0"
                max="100"
                value={localMatrix[key as keyof ScoringMatrix]}
                onChange={(e) => updateWeight(key as keyof ScoringMatrix, parseInt(e.target.value) || 0)}
              />
            </div>
          ))}

          <div className={`p-4 rounded-lg ${
            totalWeight === 100 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-medium">Total Weight:</span>
              <span className="font-bold">{totalWeight}%</span>
            </div>
            {totalWeight !== 100 && (
              <p className="text-sm mt-1">Weights must sum to 100%</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || totalWeight !== 100}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
