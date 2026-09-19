import { memo, useState } from "react";
import { thumbnailUrl } from "@/api/client";
import { formatBytes, formatDate, statusLabel } from "@/lib/format";
import { Asset } from "@/lib/types";
import "../../styles/AssetCard.scss";

type AssetCardProps = {
  asset: Asset;
  isSelected: boolean;
  isActive: boolean;
  onToggleSelect: (id: string, shiftKey: boolean) => void;
  onOpen: (id: string) => void;
};

export const AssetCard = memo(function AssetCard({
  asset,
  isSelected,
  isActive,
  onToggleSelect,
  onOpen,
}: AssetCardProps) {
  const [thumbnailError, setThumbnailError] = useState(false);

  const showPlaceholder = !asset.hasThumbnail || thumbnailError;

  const handleOpen = () => {
    onOpen(asset.id);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpen();
    }
  };

  return (
    <article
      className={[
        "card",
        isSelected && "card--selected",
        isActive && "card--active",
      ]
        .filter(Boolean)
        .join(" ")}
      role="button"
      tabIndex={0}
      aria-label={`Open ${asset.name}`}
      aria-current={isActive ? "true" : undefined}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
    >
      <div className="card__thumb">
        {showPlaceholder ? (
          <div
            className="card__thumb-placeholder"
            aria-label="No preview available"
          >
            <span aria-hidden="true">No preview</span>
          </div>
        ) : (
          <img
            src={thumbnailUrl(asset.id)}
            alt=""
            loading="lazy"
            onError={() => setThumbnailError(true)}
          />
        )}
      </div>

      <div className="card__body">
        <h3 className="card__name">{asset.name}</h3>

        <p className="muted">
          {asset.kind} · {formatBytes(asset.sizeBytes)} ·{" "}
          {formatDate(asset.updatedAt)}
        </p>

        <span
          className={`pill pill--${asset.status}`}
          aria-label={`Status: ${statusLabel(asset.status)}`}
        >
          {statusLabel(asset.status)}
        </span>
      </div>

      <input
        type="checkbox"
        className="card__check"
        checked={isSelected}
        aria-label={`Select ${asset.name}`}
        onClick={(event) => event.stopPropagation()}
        onChange={(e) =>
          onToggleSelect(asset.id, (e.nativeEvent as MouseEvent).shiftKey)
        }
      />
    </article>
  );
});