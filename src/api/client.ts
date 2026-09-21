import type { Asset, AssetPage, AssetQuery, BulkResult } from '@/lib/types';
import { ApiError } from './errors';
import { chunkArray } from '@/lib/utils';

/**
 * Baseline client. It works on a good network and falls apart on a bad one.
 *
 * Known gaps, all of which are yours to close:
 *   - no request cancellation
 *   - no retry, no backoff, no handling of Retry-After
 *   - no de-duplication of concurrent identical requests
 *   - error information is flattened into a string
 *   - callers cannot distinguish "retry this" from "do not retry this"
 */

const BULK_MAX_IDS=50;
const BULK_CONCURRENCY = 3;

function toSearchParams(query: AssetQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.status?.length) params.set('status', query.status.join(','));
  if (query.kind?.length) params.set('kind', query.kind.join(','));
  if (query.tag?.length) params.set('tag', query.tag.join(','));
  if (query.collectionId) params.set('collectionId', query.collectionId);
  if (query.owner) params.set('owner', query.owner);
  if (query.sort) params.set('sort', query.sort);
  if (query.limit) params.set('limit', String(query.limit));
  if (query.cursor) params.set('cursor', query.cursor);
  return params.toString();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let detail = res.statusText;
    let code = "write_failed";
    try {
      const body = await res.json();
      detail = body?.error?.message ?? detail;
      code = body?.error?.code ?? code;
    } catch {
      /* response was not JSON */
    }

    const retryAfterHeader = res.headers.get("Retry-After");
    const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;

    throw new ApiError(res.status, code, detail, retryAfter);
  }
  return res.json() as Promise<T>;
}

export function listAssets( query: AssetQuery, signal?: AbortSignal): Promise<AssetPage> {
  const queryString = toSearchParams(query);
  const url = `/api/assets?${queryString}`;

  return request<AssetPage>(url, { signal });
}

export function getAsset(id: string, signal?: AbortSignal): Promise<Asset> {
  return request<Asset>(`/api/assets/${id}`,{signal});
}

export function getAssetsByIds(ids: string[]): Promise<{ items: Asset[]; missing: string[] }> {
  // Note: the endpoint rejects more than 25 ids per call.
  return request(`/api/assets/batch?ids=${ids.join(',')}`);
}

export function updateAsset(
  id: string,
  version: number,
  patch: Partial<Pick<Asset, 'name' | 'status' | 'tags'>>,
): Promise<Asset> {
  return request<Asset>(`/api/assets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ version, patch }),
  });
}

export async function bulkSetStatus(ids: string[], status: Asset['status']): Promise<BulkResult> {
  // Note: Fixed- the endpoint rejects more than 50 ids per call.
   if (ids.length === 0) {
    return { applied: 0, failed: 0, results: [] };
  }

  const merged: BulkResult = { applied: 0, failed: 0, results: [] };

  try {
     const chunks = chunkArray(ids, BULK_MAX_IDS);
    for (const batch of chunkArray(chunks, BULK_CONCURRENCY)) {
      const results = await Promise.all(
        batch.map((chunk) => {

          return request<BulkResult>("/api/assets/bulk-status", {
            method: "POST",
            body: JSON.stringify({
              ids: chunk,
              status,
            }),
          });
        }),
      );
      for (const part of results) {
        merged.applied = merged.applied + part.applied;
        merged.failed = merged.failed + part.failed;
        merged.results.push(...part.results);
      }
    }
    return merged;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'network_error', 'Bulk status update failed');
  }
}

export const thumbnailUrl = (id: string) => `/api/thumb/${id}.svg`;
