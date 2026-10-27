// Gallery I/O: copies the reference images, runs the optional render command per scene and keeps
// one snapshot of the renders per run for the timeline. Reference images are only ever read.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { GalleryConfig } from "../config.ts";
import type { ImageEntry } from "../data-file.ts";
import type { GalleryItem } from "../html.ts";
import type { RawSnapshot } from "../timeline.ts";

/** Scene names: files with `sceneExt` when set, otherwise the reference images themselves. */
export const sceneNames = (root: string, g: GalleryConfig): string[] => {
  const dir = join(root, g.dir);
  if (!existsSync(dir)) return [];
  const ext = g.sceneExt ?? g.referenceExt;
  return readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .map((f) => f.slice(0, -ext.length))
    .sort();
};

/** Fills the render template. Paths are double-quoted so spaces survive both sh and cmd. */
export const renderCommand = (template: string, scene: string, out: string, name: string): string =>
  template.replaceAll("{scene}", `"${scene}"`).replaceAll("{out}", `"${out}"`).replaceAll("{name}", name);

const renderScene = (root: string, g: GalleryConfig, name: string, out: string): string | undefined => {
  const scene = `${g.dir}/${name}${g.sceneExt ?? g.referenceExt}`;
  const cmd = renderCommand(g.render ?? "", scene, out, name);
  const r = spawnSync(cmd, { cwd: root, encoding: "utf8", shell: true });
  if (r.status === 0 && existsSync(out)) return undefined;
  return (r.stderr || r.stdout || "no output").trim().split("\n")[0] ?? "no output";
};

export interface GalleryOptions {
  readonly root: string;
  readonly outDir: string;
  readonly render: boolean;
  readonly gallery: GalleryConfig;
  readonly images: Readonly<Record<string, ImageEntry>>;
}

export const buildGallery = (o: GalleryOptions): GalleryItem[] => {
  const img = join(o.outDir, "img");
  rmSync(img, { recursive: true, force: true });
  mkdirSync(img, { recursive: true });
  const doRender = o.render && o.gallery.render !== undefined;
  return sceneNames(o.root, o.gallery).map((name) => {
    const ref = join(o.root, o.gallery.dir, `${name}${o.gallery.referenceExt}`);
    const hasRef = existsSync(ref);
    if (hasRef) copyFileSync(ref, join(img, `reference-${name}.png`));
    const out = join(img, `render-${name}.png`);
    const error = doRender ? renderScene(o.root, o.gallery, name, out) : undefined;
    const approved = o.images[name]?.approved;
    return {
      name,
      ...(hasRef ? { reference: `img/reference-${name}.png` } : {}),
      ...(doRender && !error ? { render: `img/render-${name}.png` } : {}),
      ...(error ? { renderError: error } : {}),
      ...(approved === undefined ? {} : { approved }),
    };
  });
};

/** Copies this run's renders to history/<stamp>/. */
export const saveSnapshot = (outDir: string, stamp: string, gallery: readonly GalleryItem[]): void => {
  const rendered = gallery.filter((g) => g.render);
  if (rendered.length === 0) return;
  const dir = join(outDir, "history", stamp);
  mkdirSync(dir, { recursive: true });
  for (const g of rendered)
    copyFileSync(join(outDir, "img", `render-${g.name}.png`), join(dir, `${g.name}.png`));
};

const hashOf = (file: string): string => createHash("sha1").update(readFileSync(file)).digest("hex");

export const readSnapshots = (outDir: string): RawSnapshot[] => {
  const hist = join(outDir, "history");
  if (!existsSync(hist)) return [];
  return readdirSync(hist, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({
      stamp: d.name,
      images: readdirSync(join(hist, d.name))
        .filter((f) => f.endsWith(".png"))
        .sort()
        .map((f) => ({
          name: f.slice(0, -4),
          src: `history/${d.name}/${f}`,
          hash: hashOf(join(hist, d.name, f)),
        })),
    }));
};
