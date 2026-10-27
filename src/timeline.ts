export type Change = "new" | "changed" | "same";

export interface SnapshotImage {
  readonly name: string;
  readonly src: string;
  /** Compared with the previous (older) snapshot; "new" = no image with this name before. */
  readonly change: Change;
}

export interface Snapshot {
  readonly stamp: string;
  readonly images: readonly SnapshotImage[];
}

export interface RawSnapshot {
  readonly stamp: string;
  readonly images: readonly { readonly name: string; readonly src: string; readonly hash: string }[];
}

const two = (n: number): string => String(n).padStart(2, "0");

/** Snapshot folder name in local time, e.g. 2026-10-27_13-05-09 (sorts as text). */
export const stampOf = (d: Date): string =>
  `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}_` +
  `${two(d.getHours())}-${two(d.getMinutes())}-${two(d.getSeconds())}`;

/** 2026-10-27_13-05-09 → 2026-10-27 13:05:09 */
export const readableStamp = (stamp: string): string =>
  stamp.replace("_", " ").replace(/-(\d\d)-(\d\d)$/, ":$1:$2");

const changeOf = (hash: string, before: string | undefined): Change =>
  before === undefined ? "new" : before === hash ? "same" : "changed";

/** Newest first; each image is compared with the same name in the next older snapshot. */
export const buildTimeline = (raw: readonly RawSnapshot[], limit: number): Snapshot[] => {
  const sorted = [...raw].sort((a, b) => b.stamp.localeCompare(a.stamp));
  return sorted.slice(0, limit).map((s, i) => {
    const older = sorted[i + 1];
    return {
      stamp: s.stamp,
      images: s.images.map((img) => ({
        name: img.name,
        src: img.src,
        change: changeOf(img.hash, older?.images.find((o) => o.name === img.name)?.hash),
      })),
    };
  });
};
