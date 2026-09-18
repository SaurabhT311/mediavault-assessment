import { useMutation, useQuery } from "@tanstack/react-query";
import { getAsset, thumbnailUrl, updateAsset } from "@/api/client";
import { STATUSES } from "@/constants/assets";
import {
  formatBytes,
  formatDate,
  formatDuration,
  statusLabel,
} from "@/lib/format";
import type { Asset, AssetStatus } from "@/lib/types";

type Props = {
  id: string;
  onClose: () => void;
  onSaved: (asset: Asset) => void;
};

type StatusActionsProps = {
  currentStatus: AssetStatus;
  saving: boolean;
  onChange: (status: AssetStatus) => void;
};

/**
 * Baseline detail panel. Loads on open, saves with no optimistic update,
 * surfaces failures as raw strings, and does nothing about focus.
 */

function StatusActions({currentStatus, saving,
  onChange }: StatusActionsProps) {
  return (
    <div className="row">
      {STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          disabled={saving || status === currentStatus}
          onClick={() => onChange(status)}
        >
          {statusLabel(status)}
        </button>
      ))}
    </div>
  );
}

function AssetFacts({ asset }: { asset: Asset }) {
  return (
    <dl className="facts">
      <dt>Id</dt>
      <dd>{asset?.id}</dd>

      <dt>Kind</dt>
      <dd>{asset?.kind}</dd>

      <dt>Size</dt>
      <dd>{formatBytes(asset?.sizeBytes)}</dd>

      {asset?.width && asset?.height && (
        <>
          <dt>Dimensions</dt>
          <dd>
            {asset?.width}×{asset?.height}
          </dd>
        </>
      )}

      {asset.durationSec && (
        <>
          <dt>Duration</dt>
          <dd>{formatDuration(asset?.durationSec)}</dd>
        </>
      )}

      <dt>Owner</dt>
      <dd>{asset?.owner?.name}</dd>

      <dt>Updated</dt>
      <dd>{formatDate(asset?.updatedAt)}</dd>

      <dt>Version</dt>
      <dd>{asset?.version}</dd>
    </dl>
  );
}

function AssetTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;

  return (
    <ul className="tags" aria-label="Asset tags">
      {tags.map((tag) => (
        <li key={tag}>{tag}</li>
      ))}
    </ul>
  );
}

export function AssetDetail({ id, onClose, onSaved }: Props) {
  const { data: asset, isLoading, isError, error } = 
  useQuery({
    queryKey: ["asset", id],
    queryFn: ({ signal }) => getAsset(id, signal),
  });

  const updateMutation = useMutation({
    mutationFn: (status: AssetStatus) => {
      if (!asset) {
        throw new Error("Asset not loaded");
      }
      return updateAsset(asset?.id, asset?.version, { status });
    },
    onSuccess: (updatedAsset) => {
      onSaved(updatedAsset);
    },
  });

  const handleStatusChange = (status: AssetStatus) => {
    updateMutation.mutate(status);
  };

  return (
    <aside className="panel" aria-label="Asset details">
      <header className="panel__head">
        <h2>Asset detail</h2>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close asset details"
        >
          Close
        </button>
      </header>

      <div className="panel__body">
        {isLoading && (
          <p className="muted" role="status">
            Loading…
          </p>
        )}

        {isError && (
          <p className="error" role="alert">
            {error instanceof Error ? error.message : "Load failed"}
          </p>
        )}

        {asset && (
          <>
            <section aria-labelledby="asset-name">
              <img
                className="panel__thumb"
                src={thumbnailUrl(asset?.id)}
                alt=""
                loading="lazy"
              />

              <h3 id="asset-name">{asset?.name}</h3>
            </section>

            <section aria-label="Asset information">
              <AssetFacts asset={asset} />
            </section>

            <AssetTags tags={asset?.tags} />

            <section aria-labelledby="asset-status">
              <h3 id="asset-status" className="muted">
                Status
              </h3>

              {updateMutation.isError && (
                <p className="error" role="alert">
                  {updateMutation.error instanceof Error
                    ? updateMutation?.error?.message
                    : "Save failed"}
                </p>
              )}

              <StatusActions
                currentStatus={asset?.status}
                saving={updateMutation?.isPending}
                onChange={handleStatusChange}
              />
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
