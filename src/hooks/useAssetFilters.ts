import { useState } from "react";
import type { AssetKind, AssetQuery, AssetStatus } from "@/lib/types";
import { useDebounce } from "./useDebounce";

export function useAssetFilters() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<AssetStatus[]>([]);
  const [kind, setKind] = useState<AssetKind[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [sort, setSort] =
    useState<NonNullable<AssetQuery["sort"]>>(
      "updatedAt:desc",
    );

  const debouncedSearch = useDebounce(q, 1000);

  const toggleStatus = (value: AssetStatus) => {
    setStatus((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const toggleKind = (value: AssetKind) => {
    setKind((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

   const toggleTag = (value: string) => {
    setTags((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const query: AssetQuery = {
    q: debouncedSearch,
    status,
    kind,
    tags,
    sort,
    limit: 24,
  };

  return { q, setQ, status, kind, tags, sort, setSort, setTags, toggleStatus, toggleKind, toggleTag, query };
}