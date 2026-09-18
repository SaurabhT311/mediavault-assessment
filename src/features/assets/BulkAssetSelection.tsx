import type { AssetStatus } from "@/lib/types";
import { statusLabel } from "@/lib/format";
import { STATUSES } from "@/constants/assets";

type BulkAssetSelectionProps = {
  selectedCount: number;
  onStatusChange: (status: AssetStatus) => void;
  onClear: () => void;
};

export function BulkAssetSelection({ selectedCount, onStatusChange,
  onClear }: BulkAssetSelectionProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="bulkbar">
      <span>{selectedCount} selected</span>

      {STATUSES.map((status) => (
        <button key={status} onClick={() => onStatusChange(status)}>
          Set {statusLabel(status).toLowerCase()}
        </button>
      ))}

      <button onClick={onClear}>Clear selection</button>
    </div>
  );
}
