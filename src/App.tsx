import { useState } from 'react';
import { bulkSetStatus, listAssets } from '@/api/client';
import { AssetDetail } from '@/features/assets/AssetDetail';
import { AssetGrid } from '@/features/assets/AssetGrid';
import { statusLabel } from '@/lib/format';
import type { Asset, AssetStatus, AssetQuery } from '@/lib/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const STATUSES: AssetStatus[] = ['draft', 'in_review', 'approved', 'archived'];
const SORTS: Array<{ value: NonNullable<AssetQuery['sort']>; label: string }> = [
  { value: 'updatedAt:desc', label: 'Recently updated' },
  { value: 'name:asc', label: 'Name A–Z' },
  { value: 'sizeBytes:desc', label: 'Largest first' },
  { value: 'createdAt:desc', label: 'Newest' },
];

export function App() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<AssetStatus[]>([]);
  const [sort, setSort] = useState<NonNullable<AssetQuery['sort']>>('updatedAt:desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Every keystroke sends a request. Nothing is debounced or cancelled.
  const query: AssetQuery = {
    q,
    status,
    sort,
    limit: 24,
  };

  const {
  data,
  isLoading,
  isFetching,
  isError,
  error,
} = useQuery({
  queryKey: ['assets', query],
  queryFn: () => listAssets(query),
  staleTime: 15_000,
});

const items = data?.items ?? [];
const total = data?.total ?? 0;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </header>

      <div className="filters">
        {STATUSES.map((s) => (
          <label key={s}>
            <input
              type="checkbox"
              checked={status.includes(s)}
              onChange={(e) =>
                setStatus((prev) =>
                  e.target.checked ? [...prev, s] : prev.filter((x) => x !== s),
                )
              }
            />
            {statusLabel(s)}
          </label>
        ))}
        <span className="muted">
          {isLoading || isFetching ? 'Loading…' : `${items.length} of ${total.toLocaleString()} shown`}
        </span>
      </div>

      {selectedIds.size > 0 && (
        <div className="bulkbar">
          <span>{selectedIds.size} selected</span>
          {STATUSES.map((s) => (
            <button key={s} onClick={() => applyBulkStatus(s)}>
              Set {statusLabel(s).toLowerCase()}
            </button>
          ))}
          <button onClick={() => setSelectedIds(new Set())}>Clear selection</button>
        </div>
      )}

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
        />
        {activeId && (
          <AssetDetail id={activeId} onClose={() => setActiveId(null)} onSaved={handleSaved} />
        )}
      </main>
    </div>
  );
}
