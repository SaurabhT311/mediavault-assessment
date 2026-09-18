import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { AssetGrid } from "@/features/assets/AssetGrid";
import type { Asset, AssetsQueryData, AssetStatus, BulkResult } from "@/lib/types";
import { useAssets } from "./hooks/useAssets";
import { useAssetFilters } from "./hooks/useAssetFilters";
import { AssetFilters } from "./features/assets/AssetFilters";
import { BulkAssetSelection } from "./features/assets/BulkAssetSelection";
import { SORTS } from "./constants/assets";
import { bulkSetStatus } from "./api/client";

const AssetDetail = lazy(() =>
  import("@/features/assets/AssetDetail").then(
    (module) => ({
      default: module.AssetDetail,
    }),
  ),
);

export function App() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const { q, setQ, status, kind, sort, setSort, toggleStatus, toggleKind,
     query } = useAssetFilters();

  const { items, total, isLoading, isFetching, isError, error, isFetchingNextPage,
    hasNextPage, fetchNextPage } = useAssets(query);

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

// Updates selected assets optimistically and removes assets that no longer match the active filter.
const applyOptimisticStatus = ( data: AssetsQueryData, selectedIds: Set<string>, nextStatus: AssetStatus,
  statusFilter: AssetStatus[] ) => {
  return {
    ...data,
    pages: data?.pages?.map((page) => ({
      ...page,
      items: page?.items
        .map((asset) =>
          selectedIds.has(asset?.id)
            ? { ...asset, status: nextStatus }
            : asset,
        )
        .filter((asset) => {
          if (statusFilter?.length === 0) return true;
          return statusFilter.includes(asset?.status);
        }),
    })),
  };
}

// Reconciles the optimistic state with the server response and rolls back failed assets.
const reconcileBulkStatus = ( data: AssetsQueryData, results: BulkResult["results"], previousAssets: Map<string, Asset>,
  statusFilter: AssetStatus[] ) => {
  const resultById = new Map(
    results.map((result) => [result?.id, result]),
  );

  return {
    ...data,
    pages: data?.pages?.map((page) => ({
      ...page,
      items: page?.items
        .map((asset) => {
          const result = resultById.get(asset.id);
          if (!result) return asset;
          if (result?.ok) {
            return result?.asset;
          }
          return previousAssets.get(asset?.id) ?? asset;
        })
        .filter((asset) => {
          if (statusFilter?.length === 0) return true;

          return statusFilter.includes(asset?.status);
        }),
    })),
  };
}

// Restores all assets affected by a failed bulk request.
const rollbackBulkStatus = ( data: AssetsQueryData, previousAssets: Map<string, Asset>,
  statusFilter: AssetStatus[] ) => {
  return {
    ...data,
    pages: data?.pages?.map((page) => ({
      ...page,
      items: page?.items
        .map((asset) => previousAssets.get(asset?.id) ?? asset)
        .filter((asset) => {
          if (statusFilter?.length === 0) return true;

          return statusFilter?.includes(asset.status);
        }),
    })),
  };
}

const applyBulkStatus = async(next: AssetStatus) => {
  const ids = [...selectedIds];
  if (ids?.length === 0) return;
  setNotice(null);

  // Save the current state so failed updates can be rolled back.
  const previousAssets = new Map(
    items
      .filter((asset) => selectedIds.has(asset?.id))
      .map((asset) => [asset?.id, asset]),
  );

  // Optimistically update the grid before waiting for the API.
  queryClient.setQueryData<AssetsQueryData>(["assets", query], (oldData) => {
      if (!oldData) return oldData;

      return applyOptimisticStatus(oldData, selectedIds, next, query?.status ?? []);
    },
  );

  try {
    // Send the bulk status update to the server.
    const result = await bulkSetStatus(ids, next);

    // Reconcile successful updates and roll back only failed assets.
    queryClient.setQueryData<AssetsQueryData>(["assets", query], (oldData) => {
        if (!oldData) return oldData;

        return reconcileBulkStatus(oldData, result?.results, previousAssets, query?.status ?? []);
      },
    );

    const failedResults = result.results.filter(
      (result) => !result.ok,
    );

    if (failedResults?.length > 0) {
      setNotice(`${result?.applied} updated, ${failedResults?.length} failed.`);
    } else {
      setNotice(`${result?.applied} updated.`);
    }

    setSelectedIds(new Set());
    setLastSelectedId(null);
  } catch (err) {
    // Roll back all optimistic changes when the request itself fails.
    queryClient.setQueryData<AssetsQueryData>(
      ["assets", query],
      (oldData) => {
        if (!oldData) return oldData;

        return rollbackBulkStatus(
          oldData,
          previousAssets,
          query.status ?? [],
        );
      },
    );

    setNotice(
      err instanceof Error
        ? err.message
        : "Bulk update failed",
    );
  }
}

  function handleSaved(_asset: Asset) {
    queryClient.invalidateQueries({
      queryKey: ["assets"],
    });
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>MediaVault</h1>
        <input
          className="search"
          type="search"
          placeholder="Search assets"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
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
        onStatusToggle={toggleStatus}
        onKindToggle={toggleKind}
      />

      <BulkAssetSelection
        selectedCount={selectedIds.size}
        onStatusChange={applyBulkStatus}
        onClear={() => setSelectedIds(new Set())}
      />

      {notice && <p className="notice">{notice}</p>}

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
