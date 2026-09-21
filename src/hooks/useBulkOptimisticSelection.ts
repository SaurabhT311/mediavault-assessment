import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  Asset,
  AssetQuery,
  AssetsQueryData,
  AssetStatus,
} from "@/lib/types";
import { bulkSetStatus } from "@/api/client";
import {
  applyOptimisticStatus,
  reconcileBulkStatus,
  rollbackBulkStatus,
} from "@/lib/bulkOptimisticUpdate";
import type { BulkActionResultData } from "@/features/assets/BulkActionResult";

interface UseBulkOptimisticSelectionProps {
  items: Asset[];
  query: AssetQuery;
  onSelectionClear: () => void;
}

export function useBulkOptimisticSelection({
  items,
  query,
  onSelectionClear,
}: UseBulkOptimisticSelectionProps) {
  const queryClient = useQueryClient();
  const [bulkResult, setBulkResult] = useState<BulkActionResultData | null>(
    null,
  );

  const applyBulkStatus = async (next: AssetStatus, assetIds: string[], isRetry = false ) => {
    if (assetIds.length === 0) return;
    const statusFilter = query?.status ?? [];
    const previousAssets = new Map<string, Asset>();

    const currentData = queryClient.getQueryData<AssetsQueryData>([
      "assets",
      query,
    ]);

    currentData?.pages.forEach((page) => {
      page?.items?.forEach((asset) => {
        if (assetIds?.includes(asset?.id)) {
          previousAssets.set(asset?.id, asset);
        }
      });
    });

    items?.forEach((asset) => {
      if (assetIds.includes(asset?.id) && !previousAssets.has(asset?.id)) {
        previousAssets.set(asset?.id, asset);
      }
    });

    const selectedAssetIds = new Set(assetIds);

    queryClient.setQueryData<AssetsQueryData>(["assets", query], (oldData) => {
      if (!oldData) return oldData;

      return applyOptimisticStatus(oldData, selectedAssetIds, next, statusFilter);
    });

    try {
      const result = await bulkSetStatus(assetIds, next);
      onSelectionClear();

      queryClient.setQueryData<AssetsQueryData>(
        ["assets", query],
        (oldData) => {
          if (!oldData) return oldData;

          return reconcileBulkStatus(oldData, result?.results, previousAssets, statusFilter);
        },
      );

      const newFailedItems = result?.results.filter((asset) => !asset?.ok)
        .map((asset) => ({
          id: asset?.id,
          code: asset?.code,
          message: asset?.message || "Locked or status conflict",
          ok: asset?.ok,
        }));

      setBulkResult((previous) => {
        // First bulk operation
        if (!isRetry || !previous) {
          return {
            appliedCount: result?.applied ?? 0,
            failedItems: newFailedItems,
            status: next,
          };
        }

        // Retry:
        // Keep failures that were NOT part of this retry.
        const retriedIds = new Set(assetIds);

        const previousNonRetriedFailures = previous?.failedItems.filter(
          (item) => !retriedIds.has(item?.id),
        );

        return {
          appliedCount: previous?.appliedCount + (result?.applied ?? 0),
          failedItems: [...previousNonRetriedFailures, ...newFailedItems],
          status: next,
        };
      });
    } catch (error) {
      queryClient.setQueryData<AssetsQueryData>(
        ["assets", query],
        (oldData) => {
          if (!oldData) return oldData;

          return rollbackBulkStatus(oldData, previousAssets, statusFilter);
        },
      );

      throw error;
    }
  };

  return { bulkResult, setBulkResult, applyBulkStatus };
}
