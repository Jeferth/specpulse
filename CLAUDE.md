# specpulse

Pacote npm (ainda **não publicado**, `0.0.0`) que gera um painel de progresso local e
autossuficiente (`index.html` sem rede) para projetos guiados por specs: fases, marcos, specs com
checkboxes de aceite, commits que citam cada spec, galeria de imagens de referência e linha do
tempo dos renders. Nasceu do painel interno de um projeto (Draftly) e foi generalizado: tudo que
era caminho fixo virou `specpulse.config.json`.

O README (inglês) é para o público do npm; este arquivo é para quem trabalha no código.

## Onde está o quê

| Caminho                                          | Conteúdo                                                                                                                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/*.ts`                                       | Funções **puras** texto → dados → HTML (sem `node:*`, exceto `generate.ts`/`cli.ts`).                                                                          |
| `src/io/`                                        | Todo o I/O: `repo.ts` (docs + git), `images.ts`, `serve.ts` (servidor ao vivo), `watch.ts`, `live-state.ts`, `check.ts`, `client-script.ts`, `load-config.ts`. |
| `src/commands/`                                  | Subcomandos do CLI: `generate` (padrão), `init`, `mcp`, `skill`. Só aqui (e em `cli.ts`/`serve.ts`) pode `console`.                                            |
| `src/client-views.ts`                            | Visões do painel como funções puras (dados → HTML). Roda no navegador e no Vitest: **só imports de tipo**.                                                     |
| `src/client-app.ts`                              | Runtime do navegador (estado, rotas, eventos, SSE). Só importa de `client-views.ts` e tipos.                                                                   |
| `src/client-bundle.ts`                           | Junta os dois clientes num IIFE inline (tira imports/exports).                                                                                                 |
| `src/html.ts`                                    | Casca do documento: JSON embutido + script; `LIVE_SLOT` para o token do `--serve`.                                                                             |
| `src/i18n.ts`, `src/guide.ts`                    | Todo texto do painel (`en`, `pt-BR`, `es`) e o tutorial da visão Guia. Nada de string visível fora daqui.                                                      |
| `src/live.ts`, `src/claude-sessions.ts`          | Estado da visão Ao vivo e leitura **só de metadados** dos transcripts do Claude Code.                                                                          |
| `src/spec*.ts`, `src/frontmatter.ts`             | Adaptadores de formato de spec (markdown, frontmatter, auto).                                                                                                  |
| `src/mcp/`, `src/data-edit.ts`, `src/summary.ts` | Servidor MCP (JSON-RPC por stdio, sem SDK), edição do arquivo de dados, resumo em texto.                                                                       |
| `src/init.ts`                                    | Detecção pura do layout para `specpulse init`.                                                                                                                 |
| `src/generate.ts`                                | `buildPage` (lê projeto → dados da página) e `generate` (grava `index.html`).                                                                                  |
| `src/cli.ts`                                     | Bin `specpulse` (shebang); só despacha para `src/commands/`.                                                                                                   |
| `src/index.ts`                                   | API pública (exports nomeados). Mudou export → atualize o README.                                                                                              |
| `src/testing/`                                   | Fixtures de teste (fora do build).                                                                                                                             |
| `schema/`                                        | JSON Schema da config e do arquivo de dados (vão no pacote).                                                                                                   |
| `skills/specpulse/`                              | Skill do Claude Code (vai no pacote; `specpulse skill install`).                                                                                               |
| `scripts/`                                       | `clean.ts`, `pack-test.ts` (instala o `.tgz`), `ui-check.mjs` (Playwright, estático + ao vivo).                                                                |
| `examples/basic/`, `examples/frontmatter/`       | Projetos mínimos (defaults; formato frontmatter) para testar à mão.                                                                                            |
| `examples/draftly.config.json`                   | Config para um projeto no layout do Draftly (pt-BR, `fase-{n}`, `F-NNNN`, goldens).                                                                            |
| `docs/roadmap.md`, `docs/specs/`                 | Estado das melhorias e specs com critérios de aceite `- [ ]`.                                                                                                  |
| `docs/migracao-draftly.md`                       | Roteiro de migração do painel interno do Draftly.                                                                                                              |

Fluxo de dados: `config` → `io/repo.ts` lê roadmap, arquivos de fase, specs, arquivo de dados e
`git log` → `buildModel` (puro) → `buildPage` → `renderHtml(page, clientScript())` (puro) → `generate`
grava. No navegador, `client-app.ts` lê o JSON embutido e chama `renderApp` (de `client-views.ts`); com
`--serve`, `io/serve.ts` reconstrói a página a cada mudança e manda por SSE.

## Comandos

| Comando                                                                              | Para quê                                                          |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `pnpm check`                                                                         | Biome + `tsc` + Vitest. Precisa ficar verde antes de cada commit. |
| `pnpm build`                                                                         | Limpa e compila `src/` → `dist/` (JS + `.d.ts`).                  |
| `pnpm dev --cwd examples/basic`                                                      | Roda o CLI direto do TS (Node faz type-stripping).                |
| `node dist/cli.js --cwd examples/basic --open`                                       | Roda o build, como ficaria em `node_modules`.                     |
| `node dist/cli.js --cwd <projeto> --config examples/draftly.config.json --no-render` | Teste contra um projeto real.                                     |
| `node dist/cli.js --cwd examples/basic --serve --open`                               | Painel ao vivo (watch + SSE) em `http://localhost:4870`.          |
| `pnpm test:pack`                                                                     | Depois do build: empacota, instala o `.tgz` e roda o bin.         |
| `PLAYWRIGHT=<caminho do playwright> pnpm test:ui`                                    | Checagem de UI no navegador (estática + ao vivo).                 |
| `playwright screenshot file:///…/index.html out.png --full-page`                     | Conferir o visual (Playwright global).                            |
| `pnpm format`                                                                        | Aplica o formatador do Biome.                                     |

Por que existe build: o Node não faz type-stripping dentro de `node_modules`, então o pacote
publicado precisa de JS. Os fontes importam com `.ts` e o `tsc` reescreve para `.js`
(`rewriteRelativeImportExtensions`).

## Regras

- **Nunca publique nada** (npm, GitHub, `npm login`, `git remote add`, `git push`) sem o dono
  pedir explicitamente naquela mensagem. A checklist de publicação está em
  `docs/specs/S-006-pronto-para-publicar.md` e só roda quando ele pedir.
- **Nunca crie, troque, delete ou renomeie branch** sem pedido explícito. Trabalhe em `main`.
  Antes de qualquer git que escreva: `git rev-parse --abbrev-ref HEAD` e diga a branch.
- Commits pequenos, **um contexto por commit**, no estilo `tipo(escopo): emoji descrição` em
  português (ex.: `feat(core): ✨ parser de frontmatter`, `fix(html): 🐛 …`, `docs(specs): ✏️ …`,
  `test(core): ✅ …`, `chore: 🔧 …`). Corpo com linhas < 100 colunas. `git add` só de caminhos
  explícitos. Check verde antes de cada commit.
- **Zero dependências de runtime**: só `node:*`. Dependência nova (até dev) precisa do aval do dono.
- Núcleo puro e determinístico: relógio, disco, git e processos só em `src/io/`, `generate.ts` e
  `cli.ts`. Funções puras ganham teste Vitest junto (`*.test.ts`).
- O HTML não pode depender de rede: nada de CDN, fonte externa ou `fetch` para fora (o `fetch`/SSE
  do `--serve` é só para a mesma origem local). Imagens são copiadas para `<outDir>/img/` e
  referenciadas por caminho relativo.
- `client-views.ts` e `client-app.ts` viram um script inline: neles só `import type` (e, no app,
  imports de `client-views.ts`), nada de `node:*`, e nenhuma string `</script`.
- O gerador e o `--serve` nunca gravam no projeto alvo além de `<outDir>`: referências da galeria e
  o arquivo de dados são só leitura. Só comandos pedidos explicitamente gravam fora dele:
  `specpulse init` (cria config e arquivo de dados, nunca sobrescreve), `progress_update` do MCP
  (só o arquivo de dados) e `skill install` (`.claude/skills/`). Nenhum deles aprova imagem: isso é
  decisão do dono do projeto alvo.
- Os transcripts do Claude Code (`~/.claude/projects/`) só são lidos com opt-in e só saem metadados
  (ferramenta, arquivo dentro do projeto, horário, assunto de commit). Nunca texto de prompt/resposta.
- Compatibilidade: o arquivo de dados aceita chaves em português (`marcos`, `goldens`, `fonte`,
  `nota`, `aprovada`, status `feito`/`em andamento`/`a fazer`) e em inglês. Não quebre nenhum dos dois.
- TS estrito (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`), ESM, só exports nomeados,
  arquivos `kebab-case.ts`, sem `enum`/`namespace`/`class` (exceto adapter com estado),
  complexidade cognitiva ≤ 15. Comentário explica o porquê, não o quê. Código e comentários em inglês.
- Há uma lista de nomes proibidos (o nome antigo do projeto de origem e de uma ferramenta de design
  concorrente; o dono a tem, é a regra R17 do Draftly). Eles não podem aparecer em código, nomes
  de arquivo, textos nem no painel; na dúvida sobre um nome, pergunte. Não cite caminhos absolutos
  da máquina do dono em arquivos do repo.
- Armadilha conhecida: neste ambiente, heredoc no Git Bash pode comer `\\`. Para arquivos com
  barra invertida (regex em JSON/TS), use a ferramenta de escrita de arquivo, não `cat <<EOF`.

## Specs e roadmap

`docs/roadmap.md` diz a ordem; cada melhoria é um `docs/specs/S-NNN-titulo.md` com objetivo,
comportamento, fora do escopo e critérios de aceite. Ao concluir um critério, marque `- [x]` no
mesmo commit da mudança. Dúvida de produto: pare e pergunte ao dono.
