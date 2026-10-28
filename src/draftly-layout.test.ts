// Runs examples/draftly.config.json against a fixture in the Draftly layout (fase-N, F-NNNN,
// Portuguese data file, golden images) so the migration documented in docs/migracao-draftly.md
// keeps working. Only the model is asserted: the HTML is covered elsewhere.
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { generate } from "./generate.ts";
import type { Commit } from "./git-log.ts";
import { loadConfig } from "./io/load-config.ts";
import { readModelInput } from "./io/repo.ts";
import { buildModel } from "./model.ts";

const configPath = join(import.meta.dirname, "../examples/draftly.config.json");
const root = mkdtempSync(join(tmpdir(), "specpulse-draftly-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const put = (rel: string, text: string): void => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
};

put("package.json", '{"name":"draftly","private":true}');
put(
  "docs/roadmap.md",
  [
    "# Roadmap",
    "",
    "| Fase | Nome | Como testar | Foco |",
    "| --- | --- | --- | --- |",
    "| [0](fase-0/README.md) | **Fundação** | `pnpm check` verde | Fábrica |",
    "| [1](fase-1/README.md) | **Agente** | `pnpm draftly new` | IA |",
    "",
    "| Outra tabela | sem link numérico |",
    "| --- | --- |",
    "| x | y |",
  ].join("\n"),
);
put(
  "docs/fase-0/README.md",
  "| Marco | Entrega |\n| --- | --- |\n| **0.1 Repositório** | git e CI |\n| **0.2 Lint** | biome |\n",
);
put(
  "docs/fase-1/README.md",
  [
    "| Marco | Entrega | Teste |",
    "| --- | --- | --- |",
    "| **1.1 Documento** | `new` cria o arquivo | x |",
    "| **1.2 Layout** | render básico | y |",
    "| **1.3 Exportar** | PNG | z |",
  ].join("\n"),
);
put(
  "docs/specs/features/F-0001-documento.md",
  "# F-0001 · Documento\n\n- [x] cria\n- [x] salva\n- [ ] valida\n",
);
put("docs/specs/features/F-0002-operacoes.md", "# F-0002 · Operações\n\n- [x] desfaz\n- [x] refaz\n");
put("docs/specs/features/F-0003-exportar.md", "# F-0003 · Exportar\n\n- [ ] png\n");
put("docs/specs/features/README.md", "# Índice\n\n- [ ] não é spec\n");
put(
  "docs/progresso.json",
  JSON.stringify({
    marcos: {
      "0.1": { status: "feito", fonte: "docs/fase-0/README.md" },
      "0.2": { status: "feito" },
      "1.1": { specs: ["F-0001", "F-0002"], nota: "falta validar" },
      "1.2": { status: "em andamento" },
    },
    goldens: {
      capa: { aprovada: false, nota: "cor do título" },
      grade: { aprovada: true },
    },
  }),
);
for (const name of ["capa", "grade"]) {
  put(`tests/golden/${name}.draftly`, "{}");
  put(`tests/golden/${name}.png`, "not really a png");
}

const commits: Commit[] = [
  {
    hash: "abc1234",
    date: "2026-10-26T23:00:00-03:00",
    subject: "feat: documento (F-0001)",
    specs: ["F-0001"],
  },
];

describe("examples/draftly.config.json on a Draftly-layout project", () => {
  const { config } = loadConfig(root, configPath);
  const input = readModelInput(root, config, commits);
  const model = buildModel(input);

  it("loads the config as written", () => {
    expect(config.title).toBe("Draftly");
    expect(config.locale).toBe("pt-BR");
    expect(config.dataFile).toBe("docs/progresso.json");
  });

  it("reads phases and milestones from fase-N files", () => {
    expect(model.phases.map((p) => [p.n, p.name, p.file])).toEqual([
      [0, "Fundação", "docs/fase-0/README.md"],
      [1, "Agente", "docs/fase-1/README.md"],
    ]);
    const [f0, f1] = model.phases;
    expect(f0?.status).toBe("done");
    expect(f0?.progress).toBe(1);
    expect(f1?.status).toBe("doing");
    // (4/5 + 0.5 + 0) / 3
    expect(f1?.progress).toBeCloseTo(1.3 / 3);
  });

  it("accepts the Portuguese data file keys and statuses", () => {
    const ms = Object.fromEntries(model.phases.flatMap((p) => p.milestones).map((m) => [m.id, m]));
    expect(ms["0.1"]?.source).toEqual({
      kind: "manual",
      file: "docs/progresso.json",
      detail: "docs/fase-0/README.md",
    });
    expect(ms["1.1"]?.source).toEqual({ kind: "specs", ids: ["F-0001", "F-0002"], done: 4, total: 5 });
    expect(ms["1.1"]?.note).toBe("falta validar");
    expect(Object.values(ms).map((m) => [m.id, m.status])).toEqual([
      ["0.1", "done"],
      ["0.2", "done"],
      ["1.1", "doing"],
      ["1.2", "doing"],
      ["1.3", "todo"],
    ]);
    expect(input.data.images).toEqual({
      capa: { approved: false, note: "cor do título" },
      grade: { approved: true },
    });
  });

  it("reads F-NNNN specs with their checkboxes and commits", () => {
    expect(model.specs.map((s) => [s.id, s.title, s.done, s.total, s.milestone])).toEqual([
      ["F-0001", "Documento", 2, 3, "1.1"],
      ["F-0002", "Operações", 2, 2, "1.1"],
      ["F-0003", "Exportar", 0, 1, undefined],
    ]);
    expect(model.specs[0]?.commits.map((c) => c.hash)).toEqual(["abc1234"]);
  });

  it("generates without rendering and copies the goldens as references", () => {
    const { outDir, index } = generate({ root, config, render: false });
    expect(outDir).toBe(join(root, ".cache/specpulse"));
    expect(existsSync(index)).toBe(true);
    expect(existsSync(join(outDir, "img/reference-capa.png"))).toBe(true);
    expect(existsSync(join(outDir, "img/reference-grade.png"))).toBe(true);
  });
});
