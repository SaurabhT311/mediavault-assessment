import { listAssets } from "@/api/client";
import { AssetQuery } from "@/lib/types";
import { useInfiniteQuery } from "@tanstack/react-query";

export function useAssets(query: AssetQuery) {
  const result = useInfiniteQuery({
    queryKey: ["assets", query],
    queryFn: ({ pageParam, signal }) =>
      listAssets({ ...query, cursor: pageParam }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 15_000,
  });

  const items = result.data?.pages.flatMap((page) => page.items) ?? [];
  const total = result.data?.pages[0]?.total ?? 0;

  return { ...result, items, total };
}