# specpulse

Pacote npm (ainda **não publicado**, `0.0.0`) que gera um painel de progresso local e
autossuficiente (`index.html` sem rede) para projetos guiados por specs: fases, marcos, specs com
checkboxes de aceite, commits que citam cada spec, galeria de imagens de referência e linha do
tempo dos renders. Nasceu do painel interno de um projeto (Draftly) e foi generalizado: tudo que
era caminho fixo virou `specpulse.config.json`.

O README (inglês) é para o público do npm; este arquivo é para quem trabalha no código.

## Onde está o quê

| Caminho                        | Conteúdo                                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `src/*.ts`                     | Funções **puras** texto → dados → HTML (sem `node:*`, exceto `generate.ts`/`cli.ts`).              |
| `src/io/`                      | Todo o I/O: `repo.ts` (docs + git), `images.ts` (galeria/histórico), `serve.ts`, `load-config.ts`. |
| `src/generate.ts`              | Uma execução completa (lê projeto → modelo → escreve `index.html`).                                |
| `src/cli.ts`                   | Bin `specpulse` (shebang); só parse de args + `generate` + open/serve.                             |
| `src/index.ts`                 | API pública (exports nomeados). Mudou export → atualize o README.                                  |
| `src/i18n.ts`                  | Todo texto do painel, em `en` e `pt-BR`. Nada de string visível fora daqui.                        |
| `src/testing/`                 | Fixtures de teste (fora do build).                                                                 |
| `schema/`                      | JSON Schema da config e do arquivo de dados (vão no pacote).                                       |
| `examples/basic/`              | Projeto mínimo com os defaults (bom para testar à mão).                                            |
| `examples/draftly.config.json` | Config para um projeto no layout do Draftly (pt-BR, `fase-{n}`, `F-NNNN`, goldens).                |
| `docs/roadmap.md`              | Ordem das melhorias.                                                                               |
| `docs/specs/S-NNN-*.md`        | Specs das melhorias, com critérios de aceite `- [ ]`.                                              |

Fluxo de dados: `config` → `io/repo.ts` lê roadmap, arquivos de fase, specs, arquivo de dados e
`git log` → `buildModel` (puro) → `renderHtml(page, strings)` (puro) → `generate` grava.

## Comandos

| Comando                                                                              | Para quê                                                          |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `pnpm check`                                                                         | Biome + `tsc` + Vitest. Precisa ficar verde antes de cada commit. |
| `pnpm build`                                                                         | Limpa e compila `src/` → `dist/` (JS + `.d.ts`).                  |
| `pnpm dev --cwd examples/basic`                                                      | Roda o CLI direto do TS (Node faz type-stripping).                |
| `node dist/cli.js --cwd examples/basic --open`                                       | Roda o build, como ficaria em `node_modules`.                     |
| `node dist/cli.js --cwd <projeto> --config examples/draftly.config.json --no-render` | Teste contra um projeto real.                                     |
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
- O HTML não pode depender de rede: nada de CDN, fonte externa ou `fetch` para fora. Imagens são
  copiadas para `<outDir>/img/` e referenciadas por caminho relativo.
- Nunca grave nos arquivos do projeto alvo além de `<outDir>`: referências da galeria e o arquivo
  de dados são só leitura (aprovar imagem é decisão do dono do projeto alvo).
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
