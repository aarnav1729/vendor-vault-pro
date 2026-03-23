import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  GradingSectionType,
  ScoringMatrix,
  SECTION_LABELS,
  SECTION_WEIGHT,
  getParametersForSection,
} from '@/types/vendor';
import { Settings } from 'lucide-react';

interface Props {
  matrix: ScoringMatrix;
  onClose: () => void;
  onSave: (matrix: ScoringMatrix) => Promise<void>;
}

export const ScoringMatrixEditor: React.FC<Props> = ({ onClose }) => {
  const liveWeights = (["site", "procurement", "financial"] as GradingSectionType[]).map(
    (section) => ({
      section,
      label: SECTION_LABELS[section],
      weight: SECTION_WEIGHT[section],
      parameters: getParametersForSection(section),
    })
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Scoring & Weightage
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <h3 className="text-sm font-semibold">Live Backend Weightage</h3>
            <p className="text-sm text-muted-foreground">
              These are the current review weights used by the backend grading flow.
            </p>
          </div>

          <div className="space-y-4">
            {liveWeights.map(({ section, label, weight, parameters }) => (
              <div
                key={section}
                className="rounded-xl border border-border bg-muted/20 p-4 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold">{label}</h4>
                    <p className="text-sm text-muted-foreground">
                      {parameters.length} weighted parameters
                    </p>
                  </div>
                  <span className="text-2xl font-semibold text-primary">
                    {weight}%
                  </span>
                </div>

                <div className="grid gap-2">
                  {parameters.map((parameter) => (
                    <div
                      key={parameter.key}
                      className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                    >
                      <span className="text-sm">{parameter.name}</span>
                      <span className="text-sm font-medium text-muted-foreground">
                        {parameter.weight}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div>
              <h3 className="text-sm font-semibold">Section Totals</h3>
              <p className="text-sm text-muted-foreground">
                Site Performance 45%, Procurement Performance 30%, Financial Performance 25%.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
