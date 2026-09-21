import { useMutation } from "@tanstack/react-query";
import { updateAsset } from "@/api/client";
import { withRetry } from "@/lib/retry";
import type { Asset, AssetStatus } from "@/lib/types";

interface UseUpdateAssetProps {
  asset: Asset | undefined;
  onSuccess: (updatedAsset: Asset) => void;
}

export const useUpdateAsset = ({ asset, onSuccess }: UseUpdateAssetProps) => {
  return useMutation({
    mutationFn: (status: AssetStatus) => {
      if (!asset) {
        throw new Error("Asset not loaded");
      }

      return withRetry(() => updateAsset(asset.id, asset.version, { status }),
        {
          maxAttempts: 3,
          shouldRetry: (error) =>
            error.status === 500 || error.status === 429,
          fallbackDelay: 5000,
        },
      );
    },
    onSuccess,
    retry: false,
  });
};