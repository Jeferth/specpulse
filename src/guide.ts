// The in-dashboard tutorial (Guide view) in every supported locale. Code samples are shared, so the
// three languages can never disagree about commands or file formats. Inline `code` and **bold**
// are the only markup.
import type { Locale } from "./config.ts";

export type GuideBlock =
  | { readonly p: string }
  | { readonly list: readonly string[] }
  | { readonly code: string; readonly label?: string };

export interface GuideSection {
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly GuideBlock[];
}

const CODE = {
  install: `npm i -D specpulse        # or: pnpm add -D specpulse · yarn add -D specpulse · bun add -d specpulse
npx specpulse --version   # no install needed to try it: npx specpulse`,
  script: `{
  "scripts": {
    "progress": "specpulse --open",
    "progress:live": "specpulse --serve --open"
  }
}`,
  gitignore: `# .gitignore
.cache/specpulse/`,
  init: `npx specpulse init                 # detects your layout, writes specpulse.config.json + data file
npx specpulse init --locale pt-BR  # en, pt-BR or es
npx specpulse --open               # builds .cache/specpulse/index.html and opens it`,
  tree: `docs/
  roadmap.md              phase table
  phase-1/README.md       milestone table of phase 1
  specs/APP-001-parser.md one spec per file, acceptance criteria as checkboxes
  progress.json           data file (what cannot be derived from the repo)`,
  roadmap: `| Phase                  | Name     | How to test                  | Focus          |
| ---------------------- | -------- | ---------------------------- | -------------- |
| [1](phase-1/README.md) | **Core** | \`app parse x.txt\` prints it | Parser and CLI |
| [2](phase-2/README.md) | Editor   | Open the app and edit a node | Editing        |`,
  phase: `| Milestone      | Delivery                          |
| -------------- | --------------------------------- |
| **1.1 Parser** | \`parse()\` reads every sample file |
| **1.2 CLI**    | \`app parse\` prints the tree       |`,
  spec: `# APP-001 · Parser

## Acceptance

- [x] parses every file in samples/
- [ ] reports the line of a syntax error`,
  commit: `git commit -m "feat(parser): report syntax error line (APP-001)"`,
  data: `{
  "$schema": "./node_modules/specpulse/schema/data.schema.json",
  "milestones": {
    "1.1": { "specs": ["APP-001"] },
    "1.2": { "status": "done", "source": "released in v1.2" },
    "2.1": { "specs": ["APP-003", "APP-004"], "note": "blocked by design review" }
  },
  "images": {
    "home": { "approved": false }
  }
}`,
  config: `{
  "$schema": "./node_modules/specpulse/schema/config.schema.json",
  "title": "My App",
  "locale": "en",
  "outDir": ".cache/specpulse",
  "dataFile": "docs/progress.json",
  "roadmap": "docs/roadmap.md",
  "phaseFile": "docs/phase-{n}/README.md",
  "specs": { "dir": "docs/specs", "idPattern": "[A-Z]+-\\\\d{3,}", "format": "markdown" },
  "gallery": { "dir": "tests/golden", "referenceExt": ".png", "render": "node render.js {scene} {out}" },
  "live": { "check": "npm test", "checkOnChange": false, "claudeSessions": false }
}`,
  pkgConfig: `{
  "name": "my-app",
  "specpulse": { "roadmap": "ROADMAP.md", "specs": { "dir": "specs" } }
}`,
  frontmatter: `---
id: APP-007
title: Export to PDF
status: doing
milestone: "2.1"
---

## Acceptance

- [x] exports the current page
- [ ] keeps vector text`,
  formats: `{
  "specs": {
    "dir": "docs/specs",
    "format": "auto",
    "acceptanceHeading": "Acceptance",
    "idFrom": "frontmatter"
  }
}`,
  commands: `specpulse                      build the dashboard (.cache/specpulse/index.html)
specpulse --open               ...and open it in the browser
specpulse --serve [--port N]   serve on http://localhost:4870 with live updates
specpulse --no-render          skip the gallery render command
specpulse --summary            print a short text summary (for agents and CI logs)
specpulse --cwd ../app --config ./app.specpulse.json
specpulse init [--locale en|pt-BR|es]
specpulse skill install [--project|--user] [--force]
specpulse mcp                  MCP server over stdio`,
  live: `npx specpulse --serve --open
npx specpulse --serve --claude-sessions   # opt-in: metadata of local Claude Code sessions`,
  liveConfig: `{
  "live": {
    "check": "npm test",
    "checkOnChange": true,
    "claudeSessions": false,
    "commits": 30
  }
}`,
  skill: `npx specpulse skill install           # .claude/skills/specpulse/ in this project
npx specpulse skill install --user    # ~/.claude/skills/specpulse/ for every project
npx specpulse --summary               # what the agent reads to check its work`,
  mcpClaude: `claude mcp add specpulse -- npx -y specpulse mcp
# shared with the team (writes .mcp.json in the project):
claude mcp add --scope project specpulse -- npx -y specpulse mcp`,
  mcpJson: `{
  "mcpServers": {
    "specpulse": {
      "command": "npx",
      "args": ["-y", "specpulse", "mcp", "--cwd", "/path/to/your/project"]
    }
  }
}`,
  mcpTools: `progress_status    current phase, milestones, open specs (optional: phase, spec)
progress_update    edit the data file: { milestone, status?, source?, specs?, note? }
                   or { image, approved: false }; never approves images
progress_snapshot  rebuild index.html (like --no-render) and return its path + summary`,
  api: `import { generate, loadConfig } from "specpulse";

const root = process.cwd();
const { config } = loadConfig(root);
const { index } = generate({ root, config, render: false });
console.log(index);`,
  ci: `# GitHub Actions step: keep the dashboard as a build artifact
- run: npx specpulse --no-render
- run: npx specpulse --summary   # progress in the job log
- uses: actions/upload-artifact@v4
  with: { name: progress, path: .cache/specpulse }`,
  monorepo: `npx specpulse --cwd packages/web
npx specpulse --cwd packages/api --config packages/api/specpulse.config.json`,
} as const;

const en: readonly GuideSection[] = [
  {
    id: "what",
    title: "What specpulse is",
    blocks: [
      {
        p: "specpulse turns what is already in your repository into a progress dashboard: a roadmap table, one milestone table per phase, one markdown file per spec with acceptance checkboxes, your git history and, optionally, a folder of reference images.",
      },
      {
        p: "The output is a single `index.html` with no external assets: it works from `file://`, offline, and never sends anything anywhere. It fits any JavaScript project (frontend, backend, library, monorepo) because it only reads markdown, JSON and git; your build, framework and tooling are untouched.",
      },
      {
        list: [
          "**Overview**: current phase, KPIs, recently touched specs, images awaiting approval.",
          "**Phases** and **Specs**: status with the source of every number, filters and one page per spec.",
          "**Gallery** and **Timeline**: reference images next to fresh renders (optional).",
          "**Live**: commits, changed files, your check command and Claude Code activity while `--serve` runs.",
        ],
      },
    ],
  },
  {
    id: "install",
    title: "Install",
    blocks: [
      {
        p: "Requires Node.js 22.18 or newer. Install it as a dev dependency (it has no runtime dependencies):",
      },
      { code: CODE.install },
      { p: "Add scripts so everyone on the team runs it the same way:" },
      { code: CODE.script, label: "package.json" },
      { p: "The output folder is generated; keep it out of git:" },
      { code: CODE.gitignore },
    ],
  },
  {
    id: "quickstart",
    title: "Quick start",
    blocks: [
      {
        p: "`specpulse init` looks for a roadmap, phase folders, a spec folder and the ID pattern of your spec files, then writes a `specpulse.config.json` with only what differs from the defaults and an empty data file. It never overwrites existing files.",
      },
      { code: CODE.init },
      { p: "No config at all is fine too: the defaults below apply." },
    ],
  },
  {
    id: "files",
    title: "Files it reads",
    blocks: [
      { p: "With the defaults, a project looks like this:" },
      { code: CODE.tree },
      { p: "**Roadmap.** Every table row whose first cell is a numeric link is a phase:" },
      { code: CODE.roadmap, label: "docs/roadmap.md" },
      {
        p: "**Phase file.** Every row whose first cell is `**N.M Name**` is a milestone; the second cell is the delivery:",
      },
      { code: CODE.phase, label: "docs/phase-1/README.md" },
      {
        p: "**Spec.** A file whose name starts with an ID (`specs.idPattern`). The first heading `# <ID> · Title` names it and every `- [ ]` / `- [x]` is an acceptance criterion:",
      },
      { code: CODE.spec, label: "docs/specs/APP-001-parser.md" },
      { p: "Commits whose subject or body cite the ID are listed with the spec:" },
      { code: CODE.commit },
    ],
  },
  {
    id: "data",
    title: "Data file",
    blocks: [
      {
        p: 'Status is never guessed. The data file says, per milestone, either which specs make it up (progress = checked / total checkboxes) or a manual status with its source. A milestone missing from the file is "to do".',
      },
      { code: CODE.data, label: "docs/progress.json" },
      {
        list: [
          "`status`: `done`, `in progress` (or `doing`), `todo`. A manual status should always come with `source`.",
          "A milestone with `specs` gets no `status`: its progress comes from the checkboxes.",
          '`images.<name>.approved: false` shows an "awaiting owner approval" badge. Approving is a human decision.',
          "Portuguese keys work too: `marcos`, `goldens`, `fonte`, `nota`, `aprovada`, `feito`, `em andamento`, `a fazer`.",
        ],
      },
      { p: "Update it in the same commit as the spec or milestone it describes." },
    ],
  },
  {
    id: "config",
    title: "Configuration",
    blocks: [
      {
        p: "`specpulse.config.json` (or `.specpulse.json`) in the project root, or a `specpulse` key in `package.json`. Every field is optional and unknown keys are rejected, so typos fail loudly. The JSON Schema gives autocomplete in editors.",
      },
      { code: CODE.config, label: "specpulse.config.json" },
      { code: CODE.pkgConfig, label: "package.json" },
      {
        list: [
          "`title`: dashboard title (default: package.json name).",
          "`locale`: `en`, `pt-BR` or `es` (the header lets each viewer switch).",
          "`outDir`: output folder (default `.cache/specpulse`).",
          "`dataFile`, `roadmap`, `phaseFile` (`{n}` = phase number): where the inputs live.",
          "`specs`: `dir`, `idPattern` (regex), `format`, `acceptanceHeading`, `idFrom`.",
          "`gallery`: `dir`, `referenceExt`, `sceneExt`, `render` (placeholders `{scene}`, `{out}`, `{name}`).",
          "`timelineLimit`: snapshots in the timeline. `live`: options of the Live view.",
        ],
      },
    ],
  },
  {
    id: "formats",
    title: "Spec formats",
    blocks: [
      {
        p: "Besides plain markdown, specs can declare their data in a YAML frontmatter block (`id`, `title`, `status`, `milestone`). With a `status` and no checkboxes, progress comes from the status. A `milestone` in the frontmatter links the spec without listing it in the data file.",
      },
      { code: CODE.frontmatter, label: "docs/specs/export-pdf.md" },
      {
        list: [
          "`format`: `markdown` (default), `frontmatter`, or `auto` (per file).",
          "`acceptanceHeading`: only checkboxes under this heading count.",
          "`idFrom`: `heading`, `filename` or `frontmatter`.",
        ],
      },
      { code: CODE.formats, label: "specpulse.config.json" },
    ],
  },
  {
    id: "commands",
    title: "Commands",
    blocks: [{ code: CODE.commands }],
  },
  {
    id: "live",
    title: "Live mode",
    blocks: [
      {
        p: "`--serve` serves the dashboard on `127.0.0.1` and watches roadmap, phases, specs, the data file, the gallery and git. Changes reach the open page in about a second, without a reload, keeping the view, filters and scroll.",
      },
      { code: CODE.live },
      {
        p: "The **Live** view shows the commit feed, `git status`, files touched in the last 10 minutes and a **Run check** button for the command in `live.check`. With `checkOnChange` it also runs after changes, never two at a time.",
      },
      { code: CODE.liveConfig, label: "specpulse.config.json" },
      {
        p: "**Claude Code sessions** are opt-in. When enabled, specpulse reads, read-only, the local transcripts of this project in `~/.claude/projects/` and shows only metadata: tool name, file inside the project, time and commit subjects. Prompt and reply text is never shown, and nothing from it goes into the static `index.html`.",
      },
    ],
  },
  {
    id: "claude",
    title: "Claude Code skill",
    blocks: [
      {
        p: "The skill teaches Claude Code to keep the data file right: update it in the same commit when a spec or milestone is done, never guess a status, never approve images.",
      },
      { code: CODE.skill },
    ],
  },
  {
    id: "mcp",
    title: "MCP server",
    blocks: [
      {
        p: "`specpulse mcp` speaks the Model Context Protocol over stdio, so any MCP client can read and update progress without editing JSON by hand. In Claude Code:",
      },
      { code: CODE.mcpClaude },
      {
        p: 'Clients configured with an `mcpServers` file (Claude Desktop, editors, other agents) use the snippet below. Pass `--cwd` when the client does not start in your project folder; on Windows, if `npx` is not found, use `"command": "cmd"` with `["/c", "npx", ...]`.',
      },
      { code: CODE.mcpJson, label: "mcp config" },
      { p: "Tools:" },
      { code: CODE.mcpTools },
    ],
  },
  {
    id: "api",
    title: "Programmatic API and CI",
    blocks: [
      {
        p: "Everything the CLI does is exported, plus the pure parsers (`parseRoadmap`, `parseSpec`, `buildModel`, …):",
      },
      { code: CODE.api },
      { p: "In CI, build the dashboard and keep it as an artifact:" },
      { code: CODE.ci },
    ],
  },
  {
    id: "faq",
    title: "Tips and troubleshooting",
    blocks: [
      {
        list: [
          "**Monorepo**: run one dashboard per package with `--cwd`, each with its own config.",
          "**No git?** Everything still works; commits and branch are just empty.",
          '**A milestone stays "to do"**: it is missing from the data file, or its specs have no checked boxes.',
          "**A spec does not show up**: its file name must start with the ID and its first heading must be `# <ID> · Title` (or use the frontmatter format).",
          "**Frontend or backend makes no difference**: specpulse only reads docs and git, it never imports your code.",
        ],
      },
      { code: CODE.monorepo },
    ],
  },
];

const ptBR: readonly GuideSection[] = [
  {
    id: "what",
    title: "O que é o specpulse",
    blocks: [
      {
        p: "O specpulse transforma o que já está no seu repositório num painel de progresso: uma tabela de roadmap, uma tabela de marcos por fase, um markdown por spec com checkboxes de aceite, o histórico do git e, se quiser, uma pasta de imagens de referência.",
      },
      {
        p: "A saída é um único `index.html` sem nenhum recurso externo: funciona em `file://`, offline, e nunca envia nada para lugar nenhum. Serve para qualquer projeto JavaScript (frontend, backend, biblioteca, monorepo) porque só lê markdown, JSON e git; build, framework e ferramentas do projeto ficam intocados.",
      },
      {
        list: [
          "**Visão geral**: fase atual, KPIs, specs tocadas por último, imagens aguardando aprovação.",
          "**Fases** e **Specs**: status com a fonte de cada número, filtros e uma página por spec.",
          "**Galeria** e **Linha do tempo**: imagens de referência ao lado de renders novos (opcional).",
          "**Ao vivo**: commits, arquivos alterados, seu comando de check e a atividade do Claude Code enquanto o `--serve` roda.",
        ],
      },
    ],
  },
  {
    id: "install",
    title: "Instalação",
    blocks: [
      {
        p: "Requer Node.js 22.18 ou mais novo. Instale como dependência de desenvolvimento (não tem dependências de runtime):",
      },
      { code: CODE.install },
      { p: "Adicione scripts para o time todo rodar do mesmo jeito:" },
      { code: CODE.script, label: "package.json" },
      { p: "A pasta de saída é gerada; deixe-a fora do git:" },
      { code: CODE.gitignore },
    ],
  },
  {
    id: "quickstart",
    title: "Começo rápido",
    blocks: [
      {
        p: "O `specpulse init` procura roadmap, pastas de fase, pasta de specs e o padrão de ID dos arquivos de spec, e grava um `specpulse.config.json` só com o que difere dos padrões, mais um arquivo de dados vazio. Nunca sobrescreve arquivos existentes.",
      },
      { code: CODE.init },
      { p: "Sem config nenhuma também funciona: valem os padrões abaixo." },
    ],
  },
  {
    id: "files",
    title: "Arquivos que ele lê",
    blocks: [
      { p: "Com os padrões, um projeto fica assim:" },
      { code: CODE.tree },
      { p: "**Roadmap.** Toda linha de tabela cuja primeira célula é um link numérico é uma fase:" },
      { code: CODE.roadmap, label: "docs/roadmap.md" },
      {
        p: "**Arquivo de fase.** Toda linha cuja primeira célula é `**N.M Nome**` é um marco; a segunda célula é a entrega:",
      },
      { code: CODE.phase, label: "docs/phase-1/README.md" },
      {
        p: "**Spec.** Um arquivo cujo nome começa com um ID (`specs.idPattern`). O primeiro título `# <ID> · Título` dá o nome e cada `- [ ]` / `- [x]` é um critério de aceite:",
      },
      { code: CODE.spec, label: "docs/specs/APP-001-parser.md" },
      { p: "Commits que citam o ID no assunto ou no corpo aparecem junto da spec:" },
      { code: CODE.commit },
    ],
  },
  {
    id: "data",
    title: "Arquivo de dados",
    blocks: [
      {
        p: 'Status nunca é adivinhado. O arquivo de dados diz, por marco, quais specs o compõem (progresso = checkboxes marcados / total) ou um status manual com a sua fonte. Marco ausente do arquivo é "a fazer".',
      },
      { code: CODE.data, label: "docs/progress.json" },
      {
        list: [
          "`status`: `done`, `in progress` (ou `doing`), `todo`. Status manual deve vir sempre com `source`.",
          "Marco com `specs` não recebe `status`: o progresso vem dos checkboxes.",
          '`images.<nome>.approved: false` mostra o selo "aguardando aprovação do dono". Aprovar é decisão humana.',
          "Chaves em português também valem: `marcos`, `goldens`, `fonte`, `nota`, `aprovada`, `feito`, `em andamento`, `a fazer`.",
        ],
      },
      { p: "Atualize no mesmo commit da spec ou do marco que ele descreve." },
    ],
  },
  {
    id: "config",
    title: "Configuração",
    blocks: [
      {
        p: "`specpulse.config.json` (ou `.specpulse.json`) na raiz do projeto, ou uma chave `specpulse` no `package.json`. Todo campo é opcional e chave desconhecida é rejeitada, então erro de digitação aparece na hora. O JSON Schema dá autocomplete no editor.",
      },
      { code: CODE.config, label: "specpulse.config.json" },
      { code: CODE.pkgConfig, label: "package.json" },
      {
        list: [
          "`title`: título do painel (padrão: nome no package.json).",
          "`locale`: `en`, `pt-BR` ou `es` (o header deixa cada pessoa trocar).",
          "`outDir`: pasta de saída (padrão `.cache/specpulse`).",
          "`dataFile`, `roadmap`, `phaseFile` (`{n}` = número da fase): onde ficam as entradas.",
          "`specs`: `dir`, `idPattern` (regex), `format`, `acceptanceHeading`, `idFrom`.",
          "`gallery`: `dir`, `referenceExt`, `sceneExt`, `render` (marcadores `{scene}`, `{out}`, `{name}`).",
          "`timelineLimit`: snapshots na linha do tempo. `live`: opções da visão Ao vivo.",
        ],
      },
    ],
  },
  {
    id: "formats",
    title: "Formatos de spec",
    blocks: [
      {
        p: "Além do markdown simples, a spec pode declarar seus dados num bloco de frontmatter YAML (`id`, `title`, `status`, `milestone`). Com `status` e sem checkboxes, o progresso vem do status. Um `milestone` no frontmatter liga a spec ao marco sem precisar listá-la no arquivo de dados.",
      },
      { code: CODE.frontmatter, label: "docs/specs/export-pdf.md" },
      {
        list: [
          "`format`: `markdown` (padrão), `frontmatter` ou `auto` (por arquivo).",
          "`acceptanceHeading`: só contam os checkboxes abaixo deste título.",
          "`idFrom`: `heading`, `filename` ou `frontmatter`.",
        ],
      },
      { code: CODE.formats, label: "specpulse.config.json" },
    ],
  },
  {
    id: "commands",
    title: "Comandos",
    blocks: [{ code: CODE.commands }],
  },
  {
    id: "live",
    title: "Modo ao vivo",
    blocks: [
      {
        p: "O `--serve` serve o painel em `127.0.0.1` e observa roadmap, fases, specs, arquivo de dados, galeria e git. As mudanças chegam na página aberta em cerca de um segundo, sem recarregar, mantendo a visão, os filtros e o scroll.",
      },
      { code: CODE.live },
      {
        p: "A visão **Ao vivo** mostra o feed de commits, o `git status`, os arquivos tocados nos últimos 10 minutos e um botão **Rodar check** para o comando em `live.check`. Com `checkOnChange` ele também roda depois de mudanças, nunca dois ao mesmo tempo.",
      },
      { code: CODE.liveConfig, label: "specpulse.config.json" },
      {
        p: "**Sessões do Claude Code** são opt-in. Quando ligadas, o specpulse lê, só leitura, os transcripts locais deste projeto em `~/.claude/projects/` e mostra apenas metadados: nome da ferramenta, arquivo dentro do projeto, horário e assunto de commits. Texto de prompts e respostas nunca aparece, e nada disso vai para o `index.html` estático.",
      },
    ],
  },
  {
    id: "claude",
    title: "Skill do Claude Code",
    blocks: [
      {
        p: "A skill ensina o Claude Code a manter o arquivo de dados certo: atualizar no mesmo commit quando uma spec ou marco termina, nunca adivinhar status, nunca aprovar imagens.",
      },
      { code: CODE.skill },
    ],
  },
  {
    id: "mcp",
    title: "Servidor MCP",
    blocks: [
      {
        p: "O `specpulse mcp` fala o Model Context Protocol por stdio, então qualquer cliente MCP consegue ler e atualizar o progresso sem editar JSON à mão. No Claude Code:",
      },
      { code: CODE.mcpClaude },
      {
        p: 'Clientes configurados por um arquivo `mcpServers` (Claude Desktop, editores, outros agentes) usam o trecho abaixo. Passe `--cwd` quando o cliente não inicia na pasta do projeto; no Windows, se o `npx` não for encontrado, use `"command": "cmd"` com `["/c", "npx", ...]`.',
      },
      { code: CODE.mcpJson, label: "config MCP" },
      { p: "Ferramentas:" },
      { code: CODE.mcpTools },
    ],
  },
  {
    id: "api",
    title: "API programática e CI",
    blocks: [
      {
        p: "Tudo o que o CLI faz é exportado, junto com os parsers puros (`parseRoadmap`, `parseSpec`, `buildModel`, …):",
      },
      { code: CODE.api },
      { p: "No CI, gere o painel e guarde como artefato:" },
      { code: CODE.ci },
    ],
  },
  {
    id: "faq",
    title: "Dicas e problemas comuns",
    blocks: [
      {
        list: [
          "**Monorepo**: um painel por pacote com `--cwd`, cada um com sua config.",
          "**Sem git?** Tudo funciona; só commits e branch ficam vazios.",
          '**Um marco fica "a fazer"**: ele não está no arquivo de dados, ou as specs dele não têm checkbox marcado.',
          "**Uma spec não aparece**: o nome do arquivo precisa começar com o ID e o primeiro título precisa ser `# <ID> · Título` (ou use o formato frontmatter).",
          "**Frontend ou backend não faz diferença**: o specpulse só lê docs e git, nunca importa o seu código.",
        ],
      },
      { code: CODE.monorepo },
    ],
  },
];

const es: readonly GuideSection[] = [
  {
    id: "what",
    title: "Qué es specpulse",
    blocks: [
      {
        p: "specpulse convierte lo que ya está en tu repositorio en un panel de progreso: una tabla de roadmap, una tabla de hitos por fase, un markdown por spec con casillas de aceptación, tu historial de git y, si quieres, una carpeta de imágenes de referencia.",
      },
      {
        p: "La salida es un único `index.html` sin recursos externos: funciona en `file://`, sin conexión, y nunca envía nada a ningún lado. Sirve para cualquier proyecto JavaScript (frontend, backend, biblioteca, monorepo) porque solo lee markdown, JSON y git; tu build, framework y herramientas no se tocan.",
      },
      {
        list: [
          "**Resumen**: fase actual, KPIs, specs tocadas recientemente, imágenes esperando aprobación.",
          "**Fases** y **Specs**: estado con la fuente de cada número, filtros y una página por spec.",
          "**Galería** y **Línea de tiempo**: imágenes de referencia junto a renders nuevos (opcional).",
          "**En vivo**: commits, archivos modificados, tu comando de check y la actividad de Claude Code mientras corre `--serve`.",
        ],
      },
    ],
  },
  {
    id: "install",
    title: "Instalación",
    blocks: [
      {
        p: "Requiere Node.js 22.18 o más reciente. Instálalo como dependencia de desarrollo (no tiene dependencias de runtime):",
      },
      { code: CODE.install },
      { p: "Agrega scripts para que todo el equipo lo ejecute igual:" },
      { code: CODE.script, label: "package.json" },
      { p: "La carpeta de salida es generada; déjala fuera de git:" },
      { code: CODE.gitignore },
    ],
  },
  {
    id: "quickstart",
    title: "Inicio rápido",
    blocks: [
      {
        p: "`specpulse init` busca un roadmap, carpetas de fase, una carpeta de specs y el patrón de ID de tus archivos de spec, y escribe un `specpulse.config.json` solo con lo que difiere de los valores por defecto, más un archivo de datos vacío. Nunca sobrescribe archivos existentes.",
      },
      { code: CODE.init },
      { p: "Sin ninguna config también funciona: se aplican los valores por defecto de abajo." },
    ],
  },
  {
    id: "files",
    title: "Archivos que lee",
    blocks: [
      { p: "Con los valores por defecto, un proyecto se ve así:" },
      { code: CODE.tree },
      { p: "**Roadmap.** Cada fila de tabla cuya primera celda es un enlace numérico es una fase:" },
      { code: CODE.roadmap, label: "docs/roadmap.md" },
      {
        p: "**Archivo de fase.** Cada fila cuya primera celda es `**N.M Nombre**` es un hito; la segunda celda es la entrega:",
      },
      { code: CODE.phase, label: "docs/phase-1/README.md" },
      {
        p: "**Spec.** Un archivo cuyo nombre empieza con un ID (`specs.idPattern`). El primer título `# <ID> · Título` le da nombre y cada `- [ ]` / `- [x]` es un criterio de aceptación:",
      },
      { code: CODE.spec, label: "docs/specs/APP-001-parser.md" },
      { p: "Los commits que citan el ID en el asunto o el cuerpo aparecen junto a la spec:" },
      { code: CODE.commit },
    ],
  },
  {
    id: "data",
    title: "Archivo de datos",
    blocks: [
      {
        p: 'El estado nunca se adivina. El archivo de datos dice, por hito, qué specs lo componen (progreso = casillas marcadas / total) o un estado manual con su fuente. Un hito ausente del archivo está "pendiente".',
      },
      { code: CODE.data, label: "docs/progress.json" },
      {
        list: [
          "`status`: `done`, `in progress` (o `doing`), `todo`. Un estado manual siempre debe venir con `source`.",
          "Un hito con `specs` no lleva `status`: su progreso sale de las casillas.",
          '`images.<nombre>.approved: false` muestra la insignia "esperando aprobación del dueño". Aprobar es una decisión humana.',
          "También valen las claves en portugués: `marcos`, `goldens`, `fonte`, `nota`, `aprovada`, `feito`, `em andamento`, `a fazer`.",
        ],
      },
      { p: "Actualízalo en el mismo commit que la spec o el hito que describe." },
    ],
  },
  {
    id: "config",
    title: "Configuración",
    blocks: [
      {
        p: "`specpulse.config.json` (o `.specpulse.json`) en la raíz del proyecto, o una clave `specpulse` en `package.json`. Todos los campos son opcionales y las claves desconocidas se rechazan, así que los errores de tipeo saltan enseguida. El JSON Schema da autocompletado en el editor.",
      },
      { code: CODE.config, label: "specpulse.config.json" },
      { code: CODE.pkgConfig, label: "package.json" },
      {
        list: [
          "`title`: título del panel (por defecto: el nombre en package.json).",
          "`locale`: `en`, `pt-BR` o `es` (el encabezado deja que cada persona cambie).",
          "`outDir`: carpeta de salida (por defecto `.cache/specpulse`).",
          "`dataFile`, `roadmap`, `phaseFile` (`{n}` = número de fase): dónde están las entradas.",
          "`specs`: `dir`, `idPattern` (regex), `format`, `acceptanceHeading`, `idFrom`.",
          "`gallery`: `dir`, `referenceExt`, `sceneExt`, `render` (marcadores `{scene}`, `{out}`, `{name}`).",
          "`timelineLimit`: instantáneas en la línea de tiempo. `live`: opciones de la vista En vivo.",
        ],
      },
    ],
  },
  {
    id: "formats",
    title: "Formatos de spec",
    blocks: [
      {
        p: "Además del markdown simple, una spec puede declarar sus datos en un bloque de frontmatter YAML (`id`, `title`, `status`, `milestone`). Con `status` y sin casillas, el progreso sale del estado. Un `milestone` en el frontmatter vincula la spec al hito sin listarla en el archivo de datos.",
      },
      { code: CODE.frontmatter, label: "docs/specs/export-pdf.md" },
      {
        list: [
          "`format`: `markdown` (por defecto), `frontmatter` o `auto` (por archivo).",
          "`acceptanceHeading`: solo cuentan las casillas bajo este título.",
          "`idFrom`: `heading`, `filename` o `frontmatter`.",
        ],
      },
      { code: CODE.formats, label: "specpulse.config.json" },
    ],
  },
  {
    id: "commands",
    title: "Comandos",
    blocks: [{ code: CODE.commands }],
  },
  {
    id: "live",
    title: "Modo en vivo",
    blocks: [
      {
        p: "`--serve` sirve el panel en `127.0.0.1` y observa roadmap, fases, specs, el archivo de datos, la galería y git. Los cambios llegan a la página abierta en cerca de un segundo, sin recargar, conservando la vista, los filtros y el scroll.",
      },
      { code: CODE.live },
      {
        p: "La vista **En vivo** muestra el feed de commits, `git status`, los archivos tocados en los últimos 10 minutos y un botón **Ejecutar check** para el comando en `live.check`. Con `checkOnChange` también se ejecuta después de los cambios, nunca dos a la vez.",
      },
      { code: CODE.liveConfig, label: "specpulse.config.json" },
      {
        p: "Las **sesiones de Claude Code** son opcionales. Al activarlas, specpulse lee, solo lectura, las transcripciones locales de este proyecto en `~/.claude/projects/` y muestra solo metadatos: nombre de la herramienta, archivo dentro del proyecto, hora y asunto de los commits. El texto de prompts y respuestas nunca se muestra, y nada de eso entra en el `index.html` estático.",
      },
    ],
  },
  {
    id: "claude",
    title: "Skill de Claude Code",
    blocks: [
      {
        p: "La skill enseña a Claude Code a mantener correcto el archivo de datos: actualizarlo en el mismo commit cuando una spec o un hito termina, nunca adivinar un estado, nunca aprobar imágenes.",
      },
      { code: CODE.skill },
    ],
  },
  {
    id: "mcp",
    title: "Servidor MCP",
    blocks: [
      {
        p: "`specpulse mcp` habla el Model Context Protocol por stdio, así cualquier cliente MCP puede leer y actualizar el progreso sin editar JSON a mano. En Claude Code:",
      },
      { code: CODE.mcpClaude },
      {
        p: 'Los clientes configurados con un archivo `mcpServers` (Claude Desktop, editores, otros agentes) usan el fragmento de abajo. Pasa `--cwd` cuando el cliente no arranca en la carpeta del proyecto; en Windows, si no encuentra `npx`, usa `"command": "cmd"` con `["/c", "npx", ...]`.',
      },
      { code: CODE.mcpJson, label: "config MCP" },
      { p: "Herramientas:" },
      { code: CODE.mcpTools },
    ],
  },
  {
    id: "api",
    title: "API programática y CI",
    blocks: [
      {
        p: "Todo lo que hace el CLI está exportado, junto con los parsers puros (`parseRoadmap`, `parseSpec`, `buildModel`, …):",
      },
      { code: CODE.api },
      { p: "En CI, genera el panel y guárdalo como artefacto:" },
      { code: CODE.ci },
    ],
  },
  {
    id: "faq",
    title: "Consejos y problemas comunes",
    blocks: [
      {
        list: [
          "**Monorepo**: un panel por paquete con `--cwd`, cada uno con su config.",
          "**¿Sin git?** Todo funciona; solo los commits y la rama quedan vacíos.",
          '**Un hito sigue "pendiente"**: no está en el archivo de datos, o sus specs no tienen casillas marcadas.',
          "**Una spec no aparece**: el nombre del archivo debe empezar con el ID y su primer título debe ser `# <ID> · Título` (o usa el formato frontmatter).",
          "**Frontend o backend da igual**: specpulse solo lee docs y git, nunca importa tu código.",
        ],
      },
      { code: CODE.monorepo },
    ],
  },
];

export const GUIDE: Readonly<Record<Locale, readonly GuideSection[]>> = { en, "pt-BR": ptBR, es };
