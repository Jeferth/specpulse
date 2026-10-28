# S-009 · `specpulse init`

## Objetivo

Começar em um projeto novo em segundos: gerar config e arquivo de dados a partir do que já existe.

## Comportamento

- `specpulse init [--cwd <dir>] [--locale en|pt-BR|es]` procura roadmap, pastas de fase, pasta
  de specs e um padrão de ID plausível (pelos nomes de arquivo) e escreve `specpulse.config.json`
  só com o que difere dos defaults, mais um arquivo de dados vazio se não existir.
- Nunca sobrescreve arquivos existentes; imprime o que fez e o próximo comando.
- Sugere adicionar o `outDir` ao `.gitignore` (não edita sozinho).

## Decisões

- Detecção pura em `src/init.ts` (lista de caminhos POSIX + início dos arquivos de spec); disco só
  em `src/commands/init.ts`.
- Roadmap: `docs/roadmap.md`, `roadmap.md`, `doc/roadmap.md`, `.github/roadmap.md` (sem caixa).
- Fase: segmento `phase|fase|etapa|stage` + número, ou número sob `phases/`/`fases/`; vence o
  molde que cobre mais fases, com `README.md` preferido dentro da pasta.
- Specs: primeira de `docs/specs/features`, `docs/specs`, `specs/features`, `specs`, `docs/spec`,
  `spec`, `docs/features` com mais arquivos que começam com ID (`README`/`index` não contam).
- ID pelos nomes: um prefixo e uma largura → `F-\d{4}`; larguras variadas → `APP-\d{1,}`;
  prefixos diferentes → `[A-Z]+-\d{n,}`. Specs com frontmatter: todas → `frontmatter`, algumas →
  `auto`.
- Arquivo de dados: usa `progress.json`/`progresso.json`/`progreso.json` existente (em `docs/` ou
  na raiz); senão o nome segue o idioma (`docs/progress.json`, `docs/progresso.json`,
  `docs/progreso.json`). `fase-N`/`etapa-N` ou `progresso.json` sugerem `pt-BR`; `--locale` vence.
- Se já existe config (`specpulse.config.json` ou `.specpulse.json`), ela é mantida e o arquivo de
  dados é criado no caminho que ela aponta, se faltar. `title` nunca é escrito (o default já é o
  nome do pacote).

## Fora do escopo

- Gerar roadmap ou specs de exemplo no projeto do usuário.

## Critérios de aceite

- [x] Detecção (pura) testada com árvores de arquivos falsas (layout padrão, layout Draftly, nada).
- [x] Não sobrescreve config nem arquivo de dados existentes (teste).
- [x] README documenta o comando.
