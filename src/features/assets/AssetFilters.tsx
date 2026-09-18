import type { AssetKind, AssetStatus } from "@/lib/types";
import { statusLabel } from "@/lib/format";
import { STATUSES, KINDS } from "@/constants/assets";

type FilterCheckboxProps = {
  label: string;
  checked: boolean;
  onChange: () => void;
};

function FilterCheckbox({ label, checked, onChange }: 
    FilterCheckboxProps) {
  return (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
      />
      {label}
    </label>
  );
}

type AssetFiltersProps = {
  status: AssetStatus[];
  kind: AssetKind[];
  tags: string[];
  shown: number;
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  onStatusToggle: (value: AssetStatus) => void;
  onKindToggle: (value: AssetKind) => void;
  onTagToggle: (value: string) => void;
};

export function AssetFilters({ status, kind, tags, shown, total, isLoading,
  isFetching, onStatusToggle, onKindToggle, onTagToggle }: AssetFiltersProps) {
  return (
    <div className="filters">
      {STATUSES.map((value) => (
        <FilterCheckbox
          key={value}
          label={statusLabel(value)}
          checked={status.includes(value)}
          onChange={() => onStatusToggle(value)}
        />
      ))}

      {KINDS.map((value) => (
        <FilterCheckbox
          key={value}
          label={value}
          checked={kind.includes(value)}
          onChange={() => onKindToggle(value)}
        />
      ))}

      {tags.map((tag) => (
        <FilterCheckbox
          key={tag}
          label={tag}
          checked={true}
          onChange={() => onTagToggle(tag)}
        />
      ))}

      <span className="muted">
        {isLoading || isFetching
          ? "Loading…"
          : `${shown} of ${total.toLocaleString()} shown`}
      </span>
    </div>
  );
}