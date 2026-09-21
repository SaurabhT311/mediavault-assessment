import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { AssetGrid } from "@/features/assets/AssetGrid";
import type { Asset, AssetsQueryData, AssetStatus } from "@/lib/types";
import { useAssets } from "./hooks/useAssets";
import { useAssetFilters } from "./hooks/useAssetFilters";
import { AssetFilters } from "./features/assets/AssetFilters";
import  BulkAssetSelection  from "./features/assets/BulkAssetSelection";
import { SORTS } from "./constants/assets";
import "./styles/App.scss";
import { useBulkOptimisticSelection } from "./hooks/useBulkOptimisticSelection";
import { updateAssetInAssetsQuery } from "./lib/bulkOptimisticUpdate";
const AssetDetail = lazy(() => import("@/features/assets/AssetDetail"));
const BulkActionResult = lazy(() => import("@/features/assets/BulkActionResult"));

export function App() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const { q, setQ, status, kind, sort, setSort, toggleStatus, toggleKind,
     query } = useAssetFilters();

  const { items, total, isLoading, isFetching, isError, error, isFetchingNextPage,
    hasNextPage, fetchNextPage } = useAssets(query);

   const { bulkResult, setBulkResult, applyBulkStatus } = useBulkOptimisticSelection({ items, query });

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    const handleInfiniteScroll = () => {
      if (isFetchingNextPage || !hasNextPage) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        fetchNextPage();
      }
    };
    scrollContainer.addEventListener("scroll", handleInfiniteScroll);
    return () => {
      scrollContainer.removeEventListener("scroll", handleInfiniteScroll);
    };
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  const handleStatusToggle = useCallback((value: AssetStatus) => {
    const isRemoving = status.includes(value);
    toggleStatus(value);

    if (!isRemoving) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);

      items.forEach((asset) => {
        if (asset?.status === value) {
          next.delete(asset.id);
        }
      });

      return next;
    });
  },
  [status, items, toggleStatus],
);

 const addSelectedRange = ( selectedIds: Set<string>, assets: Asset[], startIndex: number,
  endIndex: number,
) => {
  const rangeStart = Math.min(startIndex, endIndex);
  const rangeEnd = Math.max(startIndex, endIndex);

  for (let index = rangeStart; index <= rangeEnd; index++) {
    selectedIds.add(assets[index]!.id);
  }
}

  const handleCheckboxSelect = useCallback((id: string, shiftKey: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        const startIndex = items.findIndex(
          (asset) => asset?.id === lastSelectedId,
        );
        const endIndex = items.findIndex((asset) => asset?.id === id);

        const isRangeSelection =
          shiftKey && lastSelectedId && startIndex !== -1 && endIndex !== -1;

        if (isRangeSelection) {
          addSelectedRange(next, items, startIndex, endIndex);
          return next;
        }

        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      setLastSelectedId(id);
    },
    [items, lastSelectedId],
  );

const handleRetry = async () => {
  if (!bulkResult) return;

  const retryableAssetIds = bulkResult.failedItems
    .filter((item) => item?.code === "conflict")
    .map((item) => item?.id);

  if (retryableAssetIds?.length === 0) return;
  console.log("bulkResult", bulkResult);
  await applyBulkStatus(bulkResult?.status, retryableAssetIds);
};

function handleSaved(updatedAsset: Asset) {
  queryClient.setQueryData(
    ["asset", updatedAsset.id],
    updatedAsset,
  );

  queryClient.setQueriesData<AssetsQueryData>(
    { queryKey: ["assets"] },
    (oldData) => {
      if (!oldData) return oldData;

      return updateAssetInAssetsQuery(
        oldData,
        updatedAsset,
        query.status ?? [],
      );
    },
  );
}

  return (
    <div className="app">
      <header className="topbar">
        <h1>MediaVault</h1>
        <input
          className="search"
          type="search"
          placeholder="Search assets by title..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Suspense fallback={<div>Loading...</div>}>
          <BulkActionResult
            result={bulkResult}
            onClose={() => setBulkResult(null)}
            onRetry={handleRetry}
          />
        </Suspense>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </header>

      <AssetFilters
        status={status}
        kind={kind}
        shown={items.length}
        total={total}
        isLoading={isLoading}
        isFetching={isFetching}
        onStatusToggle={handleStatusToggle}
        onKindToggle={toggleKind}
      />

      <BulkAssetSelection
        selectedCount={selectedIds.size}
        onStatusChange={(nextStatus) =>
          applyBulkStatus(nextStatus, [...selectedIds])
        }
        onClear={() => setSelectedIds(new Set())}
      />

      {isError && (
        <p className="error">
          {error instanceof Error ? error.message : "Failed to load assets"}
        </p>
      )}

      <main className="content">
        <AssetGrid
          assets={items}
          selectedIds={selectedIds}
          activeId={activeId}
          onToggleSelect={handleCheckboxSelect}
          onOpen={setActiveId}
          scrollContainerRef={scrollContainerRef}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
        />

        {activeId && (
          <Suspense fallback={<p className="muted">Loading details…</p>}>
            <AssetDetail
              id={activeId}
              onClose={() => setActiveId(null)}
              onSaved={handleSaved}
            />
          </Suspense>
        )}
      </main>
    </div>
  );
}
