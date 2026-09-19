import { useCallback, useState } from "react";
import type { AssetKind, AssetQuery, AssetStatus } from "@/lib/types";
import { useDebounce } from "./useDebounce";

export function useAssetFilters() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<AssetStatus[]>([]);
  const [kind, setKind] = useState<AssetKind[]>([]);
  const [sort, setSort] =
    useState<NonNullable<AssetQuery["sort"]>>(
      "updatedAt:desc",
    );

  const debouncedSearch = useDebounce(q, 500);

  const toggleStatus = useCallback((value: AssetStatus) => {
    setStatus((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  },[]);

  const toggleKind = useCallback((value: AssetKind) => {
    setKind((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  },[]);


  const query: AssetQuery = {
    q: debouncedSearch,
    status,
    kind,
    sort,
    limit: 24,
  };

  return { q, setQ, status, kind, sort, setSort, toggleStatus, toggleKind, query };
}