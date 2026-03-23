import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  GradingSectionType,
  ScoringMatrix,
  SECTION_LABELS,
  SECTION_WEIGHT,
  getParametersForSection,
} from '@/types/vendor';
import { Save, Settings } from 'lucide-react';

interface Props {
  matrix: ScoringMatrix;
  onClose: () => void;
  onSave: (matrix: ScoringMatrix) => Promise<void>;
}

export const ScoringMatrixEditor: React.FC<Props> = ({ matrix, onClose, onSave }) => {
  const [localMatrix, setLocalMatrix] = useState<ScoringMatrix>({ ...matrix });
  const [saving, setSaving] = useState(false);
  const liveWeights = (["site", "procurement", "financial"] as GradingSectionType[]).map(
    (section) => ({
      section,
      label: SECTION_LABELS[section],
      weight: SECTION_WEIGHT[section],
      parameters: getParametersForSection(section).length,
    })
  );

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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Scoring & Weightage
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Live Backend Weightage</h3>
              <p className="text-sm text-muted-foreground">
                These are the current review weights used by the backend grading flow.
              </p>
            </div>

            <div className="space-y-3">
              {liveWeights.map(({ section, label, weight, parameters }) => (
                <div key={section} className="flex items-center justify-between rounded-lg bg-background px-3 py-2 border border-border">
                  <div>
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {parameters} weighted parameters
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-primary">{weight}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Legacy Classification Matrix</h3>
              <p className="text-sm text-muted-foreground">
                Retained for backward compatibility with the older onboarding score model.
                These weights should still sum to 100%.
              </p>
            </div>

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
                <span className="font-medium">Legacy Total Weight:</span>
                <span className="font-bold">{totalWeight}%</span>
              </div>
              {totalWeight !== 100 && (
                <p className="text-sm mt-1">Weights must sum to 100%</p>
              )}
            </div>
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
