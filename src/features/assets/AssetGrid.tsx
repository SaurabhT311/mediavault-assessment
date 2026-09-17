import { thumbnailUrl } from "@/api/client";
import ListLoader from "@/commonComponent/ListLoader/ListLoader";
import { formatBytes, formatDate, statusLabel } from "@/lib/format";
import type { Asset } from "@/lib/types";
import { useVirtualizer } from "@tanstack/react-virtual";
import { RefObject, useEffect, useMemo, useRef, useState } from "react";

interface Props {
  assets: Asset[];
  selectedIds: Set<string>;
  activeId: string | null;
  onToggleSelect: (id: string) => void;
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
      const columns = Math.max(
        1,
        Math.floor(
          (grid.clientWidth + gap) / (minCardWidth + gap)
        )
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
    <div className="grid" ref={scrollContainerRef}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: rowVirtualizer.getTotalSize(),
        }}
      >
        {virtualRows.map((virtualRow) => {
          const row = rows[virtualRow.index];
          if(!row) return null;

          return (
            <div
              key={virtualRow.key}
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
              {row.map((asset) => {
                const isSelected = selectedIds.has(asset.id);
                const isActive = activeId === asset.id;

                return (
                  <div
                    key={asset.id}
                    className={[
                      "card",
                      isSelected && "card--selected",
                      isActive && "card--active",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => onOpen(asset.id)}
                  >
                    <img
                      className="card__thumb"
                      src={thumbnailUrl(asset.id)}
                      alt=""
                    />

                    <div className="card__body">
                      <p className="card__name">{asset.name}</p>

                      <p className="muted">
                        {asset.kind} · {formatBytes(asset.sizeBytes)} ·{" "}
                        {formatDate(asset.updatedAt)}
                      </p>

                      <span className={`pill pill--${asset.status}`}>
                        {statusLabel(asset.status)}
                      </span>
                    </div>

                    <input
                      type="checkbox"
                      className="card__check"
                      checked={isSelected}
                      onClick={(event) => event.stopPropagation()}
                      onChange={() => onToggleSelect(asset.id)}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {isFetchingNextPage && <div style={{ minHeight: "120px", grid: "1 / -1" }}>
           <ListLoader />
         </div>}
    </div>
  );
}
