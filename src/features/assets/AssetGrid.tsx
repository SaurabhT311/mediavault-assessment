import ListLoader from "@/commonComponent/ListLoader/ListLoader";
import type { Asset } from "@/lib/types";
import { useVirtualizer } from "@tanstack/react-virtual";
import { RefObject, useEffect, useMemo, useState } from "react";
import { lazy, Suspense } from "react";
import "../../styles/AssetGrid.scss";

const AssetCard = lazy(() =>
  import("./AssetCard").then(
    (module) => ({
      default: module.AssetCard,
    }),
  ),
);

interface Props {
  assets: Asset[];
  selectedIds: Set<string>;
  activeId: string | null;
  onToggleSelect: (id: string, shiftKey: boolean) => void;
  onOpen: (id: string) => void;
  scrollContainerRef: RefObject<HTMLDivElement>;
  isFetchingNextPage: Boolean;
  hasNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
}

/**
 * Baseline grid. Renders every row it is given, re-renders every card on any
 * selection change, and is not reachable by keyboard.
 */
export function AssetGrid({
  assets,
  selectedIds,
  activeId,
  onToggleSelect,
  onOpen,
  scrollContainerRef,
  isFetchingNextPage,
}: Props) {
  const [columnCount, setColumnCount] = useState(1);

  useEffect(() => {
    const grid = scrollContainerRef.current;
    if (!grid) return;
    const updateColumnCount = () => {
      const { columnGap } = getComputedStyle(grid);
      const gap = parseFloat(columnGap) || 12;
      const minCardWidth = 250;
      const columns = Math.max(1,
        Math.floor((grid.clientWidth + gap) / (minCardWidth + gap)),
      );
      setColumnCount(columns);
    };
    updateColumnCount();
    const resizeObserver = new ResizeObserver(updateColumnCount);
    resizeObserver.observe(grid);

    return () => {
      resizeObserver.disconnect();
    };
  }, [assets?.length]);

  const rows = useMemo(() => {
    const result: Asset[][] = [];
    for (let i = 0; i < assets.length; i += columnCount) {
      result.push(assets.slice(i, i + columnCount));
    }
    return result;
  }, [assets, columnCount]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 250,
    overscan: 1,
  });

  if (assets.length === 0) {
    return (
      <div className="empty">
        <p>Nothing matches these filters.</p>
        <p className="muted">
          Clear the search box or widen the status filter.
        </p>
      </div>
    );
  }
  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <div className={`grid ${selectedIds.size > 0 ? "grid-filter" : "grid-height"}`} ref={scrollContainerRef}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: rowVirtualizer.getTotalSize(),
        }}
      >
        {virtualRows.map((virtualRow) => {          
          const row = rows[virtualRow.index];
          if (!row) return null;

          return (
            <div
              key={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              data-index={virtualRow.index}
              className="grid-row"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {row.map((asset) => (
                <Suspense fallback={<p className="muted">Loading details…</p>}>
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    isSelected={selectedIds.has(asset.id)}
                    isActive={activeId === asset.id}
                    onToggleSelect={onToggleSelect}
                    onOpen={onOpen}
                  />
                </Suspense>
              ))}
            </div>
          );
        })}
      </div>

      {isFetchingNextPage && (
        <div style={{ minHeight: "120px", grid: "1 / -1" }} role="loader"
          aria-label="Loading more assets">
          <ListLoader />
        </div>
      )}
    </div>
  );
}
