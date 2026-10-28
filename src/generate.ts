// One run: read the project, build the page data, write <outDir>/index.html. The live server reuses
// buildPage to rebuild the data on every change without touching the gallery images.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { Config } from "./config.ts";
import type { ImageEntry } from "./data-file.ts";
import { type GalleryItem, type Page, type PageMeta, renderHtml } from "./html.ts";
import { clientScript } from "./io/client-script.ts";
import { buildGallery, readSnapshots, saveSnapshot } from "./io/images.ts";
import { commitIdPattern, readCommits, readModelInput, readRepoState } from "./io/repo.ts";
import { packageVersion } from "./io/version.ts";
import { buildModel } from "./model.ts";
import { buildTimeline, readableStamp, stampOf } from "./timeline.ts";

export interface GenerateOptions {
  /** Project root. */
  readonly root: string;
  readonly config: Config;
  /** Run the configured render command (false = --no-render). */
  readonly render: boolean;
  readonly now?: Date;
}

export interface GenerateResult {
  readonly outDir: string;
  readonly index: string;
  readonly page: Page;
}

export interface BuildPageOptions extends GenerateOptions {
  /**
   * Gallery of a previous build to reuse instead of copying and rendering again (live rebuilds);
   * only the approval flags are refreshed from the data file.
   */
  readonly keepGallery?: readonly GalleryItem[];
}

const metaOf = (config: Config, outDirRel: string): PageMeta => {
  const g = config.gallery;
  const inputs = [config.roadmap, config.phaseFile.replace("{n}", "N"), config.specs.dir, config.dataFile];
  return {
    title: config.title,
    locale: config.locale,
    version: packageVersion(),
    inputs: g ? [...inputs, g.dir] : inputs,
    roadmap: config.roadmap,
    specsDir: config.specs.dir,
    ...(g
      ? { gallery: { dir: g.dir, renderCommand: g.render !== undefined, historyDir: `${outDirRel}/history` } }
      : {}),
    config,
  };
};

const galleryOf = (
  o: BuildPageOptions,
  outDir: string,
  images: Readonly<Record<string, ImageEntry>>,
): GalleryItem[] => {
  const g = o.config.gallery;
  if (!g) return [];
  if (o.keepGallery)
    return o.keepGallery.map((item) => {
      const { approved: _old, ...rest } = item;
      const approved = images[item.name]?.approved;
      return approved === undefined ? rest : { ...rest, approved };
    });
  return buildGallery({ root: o.root, outDir, render: o.render, gallery: g, images });
};

/** Reads the project and returns the page data; copies/renders gallery images unless kept. */
export const buildPage = (o: BuildPageOptions): Page => {
  const { root, config } = o;
  const now = o.now ?? new Date();
  const outDir = resolve(root, config.outDir);
  mkdirSync(outDir, { recursive: true });

  const commits = readCommits(root, commitIdPattern(root, config));
  const input = readModelInput(root, config, commits);
  const rendered = !o.keepGallery && o.render && config.gallery?.render !== undefined;
  const gallery = galleryOf(o, outDir, input.data.images);
  if (rendered) saveSnapshot(outDir, stampOf(now), gallery);

  return {
    meta: metaOf(config, relative(root, outDir).replaceAll("\\", "/")),
    model: buildModel(input),
    gallery,
    timeline: config.gallery ? buildTimeline(readSnapshots(outDir), config.timelineLimit) : [],
    repo: {
      ...readRepoState(root),
      ...(commits[0] ? { lastCommit: commits[0] } : {}),
      generatedAt: readableStamp(stampOf(now)),
      rendered,
    },
  };
};

export const generate = (o: GenerateOptions): GenerateResult => {
  const page = buildPage(o);
  const outDir = resolve(o.root, o.config.outDir);
  const index = join(outDir, "index.html");
  writeFileSync(index, renderHtml(page, clientScript()));
  return { outDir, index, page };
};
