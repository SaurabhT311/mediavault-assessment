import { memo } from "react";
import { thumbnailUrl } from "@/api/client";
import { formatBytes, formatDate, statusLabel } from "@/lib/format";
import { Asset } from "@/lib/types";

type AssetCardProps = {
  asset: Asset;
  isSelected: boolean;
  isActive: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
};

export const AssetCard = memo(function AssetCard({
  asset,
  isSelected,
  isActive,
  onToggleSelect,
  onOpen,
}: AssetCardProps) {

  return (
    <div
      className={[
        "card",
        isSelected && "card--selected",
        isActive && "card--active",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onOpen(asset.id)}
    >
      <img
        className="card__thumb"
        src={thumbnailUrl(asset.id)}
        alt=""
      />

      <div className="card__body">
        <p className="card__name">{asset.name}</p>

        <p className="muted">
          {asset.kind} · {formatBytes(asset.sizeBytes)} ·{" "}
          {formatDate(asset.updatedAt)}
        </p>

        <span className={`pill pill--${asset.status}`}>
          {statusLabel(asset.status)}
        </span>
      </div>

      <input
        type="checkbox"
        className="card__check"
        checked={isSelected}
        onClick={(event) => event.stopPropagation()}
        onChange={() => onToggleSelect(asset.id)}
      />
    </div>
  );
});