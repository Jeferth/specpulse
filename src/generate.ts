// One run: read the project, build the model, write <outDir>/index.html. Returns the paths written.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { Config } from "./config.ts";
import { type GalleryItem, type PageMeta, renderHtml } from "./html.ts";
import { stringsFor } from "./i18n.ts";
import { buildGallery, readSnapshots, saveSnapshot } from "./io/images.ts";
import { readCommits, readModelInput, readRepoState } from "./io/repo.ts";
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
}

const metaOf = (config: Config, outDirRel: string): PageMeta => {
  const g = config.gallery;
  const inputs = [config.roadmap, config.phaseFile.replace("{n}", "N"), config.specs.dir, config.dataFile];
  return {
    title: config.title,
    inputs: g ? [...inputs, g.dir] : inputs,
    specsDir: config.specs.dir,
    ...(g
      ? { gallery: { dir: g.dir, renderCommand: g.render !== undefined, historyDir: `${outDirRel}/history` } }
      : {}),
  };
};

export const generate = (o: GenerateOptions): GenerateResult => {
  const { root, config } = o;
  const now = o.now ?? new Date();
  const outDir = resolve(root, config.outDir);
  mkdirSync(outDir, { recursive: true });

  const commits = readCommits(root, config.specs.idPattern);
  const input = readModelInput(root, config, commits);
  const rendered = o.render && config.gallery?.render !== undefined;
  const gallery: GalleryItem[] = config.gallery
    ? buildGallery({ root, outDir, render: o.render, gallery: config.gallery, images: input.data.images })
    : [];
  if (rendered) saveSnapshot(outDir, stampOf(now), gallery);

  const html = renderHtml(
    {
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
    },
    stringsFor(config.locale),
  );
  const index = join(outDir, "index.html");
  writeFileSync(index, html);
  return { outDir, index };
};
