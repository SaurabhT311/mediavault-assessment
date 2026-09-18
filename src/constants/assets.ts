import type {
  AssetKind,
  AssetStatus,
  AssetQuery,
} from "@/lib/types";

export const STATUSES: AssetStatus[] = [
  "draft",
  "in_review",
  "approved",
  "archived",
];

export const KINDS: AssetKind[] = [
  "image",
  "video",
  "document",
];

export const SORTS: Array<{
  value: NonNullable<AssetQuery["sort"]>;
  label: string;
}> = [
  {
    value: "updatedAt:desc",
    label: "Recently updated",
  },
  {
    value: "name:asc",
    label: "Name A–Z",
  },
  {
    value: "sizeBytes:desc",
    label: "Largest first",
  },
  {
    value: "createdAt:desc",
    label: "Newest",
  },
];