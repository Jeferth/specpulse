# S-007 · Migração do Draftly para o pacote

## Objetivo

Documentar como o Draftly troca o painel interno (`tools/progress`, comando `pnpm progress`) pelo
specpulse, sem perder dados nem histórico. **Só documentar; a execução é decisão do dono e
acontece no repositório do Draftly.**

## Comportamento (passo a passo a documentar em `docs/migracao-draftly.md`)

1. No specpulse: `pnpm build`.
2. No Draftly: aprovar a dependência pela política de libs do projeto, depois
   `pnpm add -D -w specpulse@link:../specpulse` (pasta irmã).
3. Copiar `examples/draftly.config.json` para `specpulse.config.json` na raiz do Draftly
   (o `$schema` passa a apontar para `./node_modules/specpulse/schema/config.schema.json`).
4. Trocar o script: `"progress": "specpulse"`. As flags (`--open`, `--serve`, `--port`,
   `--no-render`) são as mesmas.
5. `docs/progresso.json` fica onde está (formato em português é aceito sem mudança).
6. Histórico da linha do tempo: mover `.cache/progress/history/` para `.cache/specpulse/history/`
   (ou apontar `outDir` para `.cache/progress`).
7. Atualizar o `CLAUDE.md` do Draftly (linha do comando `pnpm progress`) e remover
   `tools/progress` num commit próprio, depois de comparar os dois painéis.
8. Quando o pacote for publicado, trocar `link:../specpulse` pela versão do npm.

## Diferenças conhecidas a registrar

- Classes CSS e chave de tema no `localStorage` mudaram (`specpulse-theme`).
- Imagens copiadas como `img/reference-<nome>.png` (antes `img/golden-<nome>.png`).
- KPI "goldens aguardando aprovação" virou "imagens aguardando aprovação".

## Fora do escopo

- Editar qualquer arquivo do Draftly a partir desta sessão.

## Critérios de aceite

- [ ] `docs/migracao-draftly.md` escrito com os passos e as diferenças.
- [ ] Teste automatizado que roda o `examples/draftly.config.json` contra uma fixture no layout do
      Draftly (fase-N, F-NNNN, `progresso.json`, goldens) e confere os números.
- [ ] Dono revisou o roteiro.
