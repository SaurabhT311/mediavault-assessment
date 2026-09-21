import { listAssets } from "@/api/client";
import { withRetry } from "@/lib/retry";
import { AssetQuery } from "@/lib/types";
import { useInfiniteQuery } from "@tanstack/react-query";

export function useAssets(query: AssetQuery) {
  const result = useInfiniteQuery({
    queryKey: ["assets", query],
    queryFn: ({ pageParam, signal }) =>
      withRetry(() => listAssets({
            ...query,
            cursor: pageParam,
          },
          signal,
        ),
      {
        maxAttempts: 3,
        shouldRetry: (error) =>
          error.status === 503 || error.status === 429,
      },
    ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 15_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const items = result.data?.pages.flatMap((page) => page.items) ?? [];
  const total = result.data?.pages[0]?.total ?? 0;

  return { ...result, items, total };
}