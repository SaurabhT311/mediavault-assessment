import type { Asset, AssetsQueryData, AssetStatus, BulkResult } from "./types";

// Updates selected assets optimistically and removes assets that no longer match the active filter.
export const applyOptimisticStatus = (
  data: AssetsQueryData,
  selectedIds: Set<string>,
  nextStatus: AssetStatus,
): AssetsQueryData => {
  return {
    ...data,
    pages: data?.pages?.map((page) => ({
      ...page,
      items: page?.items?.map((asset) =>
        selectedIds.has(asset?.id)
          ? { ...asset, status: nextStatus }
          : asset,
      ),
    })),
  };
}

// Reconciles the optimistic state with the server response and rolls back failed assets.

export const reconcileBulkStatus = (
  data: AssetsQueryData,
  results: BulkResult["results"],
  previousAssets: Map<string, Asset>,
  statusFilter: AssetStatus[],
): AssetsQueryData => {
  const resultById = new Map(
    results.map((result) => [result?.id, result]),
  );

  const successfulRemovedCount = results?.filter((result) => {
    if (!result.ok) return false;

    const previousAsset = previousAssets.get(result?.id);

    return (previousAsset && statusFilter?.length > 0 && statusFilter?.includes(previousAsset.status) &&
      !statusFilter?.includes(result?.asset?.status)
    );
  }).length;

  return {
    ...data,
    pages: data?.pages?.map((page, index) => ({
      ...page,

      total: index === 0 ? Math.max(0, page?.total - successfulRemovedCount)
          : page.total,

      items: page?.items.map((asset) => {
          const result = resultById.get(asset?.id);

            return result?.ok ? result.asset : result
              ? (previousAssets.get(asset.id) ?? asset)
              : asset;
        }).filter((asset) => {
          if (statusFilter?.length === 0) {
            return true;
          }

          return statusFilter.includes(asset?.status);
        }),
    })),
  };
}

// Restores all assets affected by a failed bulk request.

export const rollbackBulkStatus = (
  data: AssetsQueryData,
  previousAssets: Map<string, Asset>,
  statusFilter: AssetStatus[],
): AssetsQueryData => {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((asset) =>
            previousAssets.get(asset.id) ?? asset,
        )
        .filter((asset) => {
          if (statusFilter?.length === 0) {
            return true;
          }

          return statusFilter.includes(asset?.status);
        }),
    })),
  };
}