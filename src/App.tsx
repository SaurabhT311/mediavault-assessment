import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AssetDetail } from "@/features/assets/AssetDetail";
import { AssetGrid } from "@/features/assets/AssetGrid";
import type { Asset, AssetStatus } from "@/lib/types";
import { useAssets } from "./hooks/useAssets";
import { useAssetFilters } from "./hooks/useAssetFilters";
import { AssetFilters } from "./features/assets/AssetFilters";
import { BulkAssetSelection } from "./features/assets/BulkAssetSelection";
import { SORTS } from "./constants/assets";
import { bulkSetStatus } from "./api/client";

export function App() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const { q, setQ, status, kind, tags, sort, setSort, toggleStatus, toggleKind,
    toggleTag, query } = useAssetFilters();

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

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  async function applyBulkStatus(next: AssetStatus) {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setNotice(null);
    try {
      // Keeping the existing API call/function as-is for now.
      const result = await bulkSetStatus(ids, next);
      setNotice(`${result.applied} updated, ${result.failed} failed.`);
      setSelectedIds(new Set());
      await queryClient.invalidateQueries({
        queryKey: ["assets"],
      });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Bulk update failed");
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
        tags={tags}
        shown={items.length}
        total={total}
        isLoading={isLoading}
        isFetching={isFetching}
        onStatusToggle={toggleStatus}
        onKindToggle={toggleKind}
        onTagToggle={toggleTag}
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
          onToggleSelect={toggleSelect}
          onOpen={setActiveId}
          scrollContainerRef={scrollContainerRef}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
        />

        {activeId && (
          <AssetDetail
            id={activeId}
            onClose={() => setActiveId(null)}
            onSaved={handleSaved}
          />
        )}
      </main>
    </div>
  );
}
