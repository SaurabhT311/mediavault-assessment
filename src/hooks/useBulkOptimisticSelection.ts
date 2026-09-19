import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Asset, AssetQuery, AssetsQueryData, AssetStatus } from "@/lib/types";
import { bulkSetStatus } from "@/api/client";
import { applyOptimisticStatus, reconcileBulkStatus, rollbackBulkStatus } from "@/lib/bulkOptimisticUpdate";
import type { BulkActionResultData } from "@/features/assets/BulkActionResult";

interface UseBulkOptimisticSelectionProps {
  items: Asset[];
  query: AssetQuery
}

export function useBulkOptimisticSelection({ items,query }: UseBulkOptimisticSelectionProps) {
  const queryClient = useQueryClient();
  const [bulkResult, setBulkResult] = useState<BulkActionResultData | null>(null);

  const applyBulkStatus = async ( next: AssetStatus, assetIds: string[]) => {
    if (assetIds.length === 0) return;

    const statusFilter = query?.status ?? [];
    const previousAssets = new Map(
      items?.filter((asset) => assetIds?.includes(asset?.id))
        .map((asset) => [asset.id, asset]),
    );
    const selectedAssetIds = new Set(assetIds);

    // Optimistic update
    queryClient.setQueryData<AssetsQueryData>(
      ["assets", query],
      (oldData) => {
        if (!oldData) return oldData;

        return applyOptimisticStatus(oldData,selectedAssetIds,next);
      },
    );

    try {
      const result = await bulkSetStatus(assetIds,next);

      // Reconcile API response with optimistic state
      queryClient.setQueryData<AssetsQueryData>(
        ["assets", query],
        (oldData) => {
          if (!oldData) return oldData;

          return reconcileBulkStatus( oldData, result?.results, previousAssets, statusFilter );
        },
      );

      const failedItems = result.results.filter((asset) => !asset.ok)
        .map((asset) => ({
          id: asset?.id,
          code: asset?.code,
          message: asset?.message || "Locked or status conflict",
          ok: asset?.ok,
        }));

      setBulkResult({appliedCount: result.applied || 0, failedItems, status: next});
    } catch (error) {
      // Roll back optimistic update if request itself fails
      queryClient.setQueryData<AssetsQueryData>(
        ["assets", query],
        (oldData) => {
          if (!oldData) return oldData;

          return rollbackBulkStatus(
            oldData,
            previousAssets,
            statusFilter,
          );
        },
      );

      throw error;
    }
  };

  return { bulkResult, setBulkResult, applyBulkStatus };
}