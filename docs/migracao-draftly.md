# Migração do Draftly para o specpulse

Roteiro para o Draftly trocar o painel interno (`tools/progress`, comando `pnpm progress`) pelo
pacote specpulse sem perder dados nem histórico. **Este documento só descreve os passos; a
execução é decisão do dono e acontece no repositório do Draftly.** Nada aqui foi feito no Draftly.

A config usada é [`examples/draftly.config.json`](../examples/draftly.config.json). O teste
`src/draftly-layout.test.ts` roda essa config contra uma fixture no layout do Draftly (`fase-N`,
`F-NNNN`, `docs/progresso.json` com chaves em português, goldens `*.png` + `*.draftly`) e confere
progresso das fases, status dos marcos e contagem de critérios das specs. Se ele estiver verde, os
números do painel novo batem com o formato atual do Draftly.

## Pré-requisitos

- Node 22.18 ou mais novo (o mesmo exigido pelo specpulse).
- specpulse e Draftly como pastas irmãs (`../specpulse`), enquanto o pacote não estiver no npm.
- Árvore limpa no Draftly, numa branch escolhida pelo dono.

## Passo a passo

1. **Build do specpulse.** Na pasta do specpulse:

   ```sh
   pnpm install
   pnpm build
   ```

2. **Dependência no Draftly.** Aprovar a dependência pela política de libs do projeto e então:

   ```sh
   pnpm add -D -w specpulse@link:../specpulse
   ```

3. **Config.** Copiar `examples/draftly.config.json` para `specpulse.config.json` na raiz do
   Draftly e trocar o `$schema` para o schema instalado:

   ```json
   "$schema": "./node_modules/specpulse/schema/config.schema.json"
   ```

   O resto fica igual (`locale: "pt-BR"`, `phaseFile: "docs/fase-{n}/README.md"`,
   `specs.dir: "docs/specs/features"`, `idPattern: "F-\\d{4}"`, galeria em `tests/golden`).

4. **Script.** No `package.json` do Draftly: `"progress": "specpulse"`. As flags de antes
   continuam iguais: `--open`, `--serve`, `--port <n>`, `--no-render`.

5. **Arquivo de dados.** `docs/progresso.json` fica onde está e como está: chaves em português
   (`marcos`, `goldens`, `fonte`, `nota`, `aprovada`) e status `feito` / `em andamento` /
   `a fazer` são aceitos sem mudança. O specpulse nunca grava nesse arquivo por conta própria
   (só o servidor MCP, quando um agente chama a ferramenta de atualização).

6. **Histórico da linha do tempo.** Escolher uma das opções:
   - mover `.cache/progress/history/` para `.cache/specpulse/history/`; ou
   - apontar `"outDir": ".cache/progress"` na config, mantendo a pasta antiga.

7. **Comparar os dois painéis** (`pnpm progress` antigo × novo) com o mesmo commit. Conferir
   percentuais das fases, status dos marcos, contagem de critérios das specs e a galeria.

8. **Limpeza, num commit próprio.** Atualizar a linha do comando `pnpm progress` no `CLAUDE.md` do
   Draftly e remover `tools/progress`.

9. **Depois da publicação no npm.** Trocar `link:../specpulse` pela versão publicada
   (`pnpm add -D -w specpulse@^0.1.0`).

## O que o painel novo traz

- **App com várias visões e rotas por hash**, num único `index.html` sem rede:
  `#/overview`, `#/phases`, `#/specs`, `#/gallery`, `#/timeline`, `#/live`, `#/guide`.
  Os links podem ser guardados e compartilhados (ex.: `index.html#/specs`).
- **Ao vivo com `--serve`:** o servidor observa os arquivos do projeto e o painel aberto se
  atualiza sozinho (SSE em `127.0.0.1`), sem recarregar a página à mão. A visão `#/live` mostra
  commits recentes, arquivos alterados e o resultado do check configurado em `live.check`
  (ex.: `"live": { "check": "pnpm -s check" }`). Leitura das sessões do Claude Code é opt-in
  (`live.claudeSessions`).
- **Comandos novos:**
  - `specpulse init` — gera `specpulse.config.json` e um arquivo de dados vazio a partir do layout
    detectado. No Draftly não é necessário (a config já existe), mas serve de conferência.
  - `specpulse mcp` — servidor MCP por stdio para agentes lerem o status e atualizarem o arquivo
    de dados por ferramenta. Registro no Claude Code:
    `claude mcp add specpulse -- npx specpulse mcp`.
  - `specpulse skill install` — instala a skill do Claude Code (`.claude/skills/specpulse/`) que
    ensina o agente a manter o arquivo de dados certo.
  - `specpulse --summary` — resumo curto em texto (fase atual, marcos, specs abertas), útil em
    hooks e no terminal.

## Diferenças conhecidas

| Antes (`tools/progress`)                 | Agora (specpulse)                                          |
| ---------------------------------------- | ---------------------------------------------------------- |
| Classes CSS próprias                     | Classes novas; CSS customizado antigo não se aplica.       |
| Chave de tema no `localStorage` antiga   | `specpulse-theme` (a preferência de tema volta ao padrão). |
| Imagens copiadas como `img/golden-*.png` | `img/reference-<nome>.png` (e `img/render-<nome>.png`).    |
| KPI "goldens aguardando aprovação"       | "imagens aguardando aprovação".                            |
| Página única com seções                  | App com visões e rotas por hash (`#/overview` etc.).       |
| Saída em `.cache/progress/`              | Saída em `.cache/specpulse/` (ou o `outDir` configurado).  |

Links externos que apontavam para `img/golden-*.png` dentro da pasta de saída precisam ser
atualizados; os arquivos em `tests/golden/` não mudam (o specpulse só lê).

## Reverter

Enquanto `tools/progress` não for removido (passo 8), basta voltar o script `progress` para o
comando antigo. O `docs/progresso.json` não é alterado pela migração, então não há dado a
restaurar.
