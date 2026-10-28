# S-006 · Pronto para publicar

## Objetivo

Deixar o pacote pronto para o npm e o GitHub, com a publicação em si executada **só quando o dono
pedir**.

## Comportamento

- `package.json`: `publishConfig: { access: "public" }`, `files` = `dist`, `schema`, `skills`,
  `README.md`, `LICENSE` (o `package.json` sempre entra), `sideEffects: false` (não afeta o bin).
  `version` = `0.1.0` (preparada em 2026-10-28). `repository`, `homepage` e `bugs` **ficam de
  fora até o dono criar o repositório** (ver Decisões).
- Conferir que o tarball só tem `dist/`, `schema/`, `skills/`, `README.md`, `LICENSE`,
  `package.json`. O pnpm 10.14 não tem `pnpm pack --dry-run`, então a conferência usa
  `npm pack --dry-run --json` (é o mesmo `files`; e é o npm que empacota no workflow de release).
- README: imagem com URL absoluta (o npm não resolve caminho relativo sem `repository`). Como o
  repositório ainda não existe, `docs/assets/screenshot.png` vai no pacote (57 KB) e o README
  aponta para ela pelo jsDelivr (`cdn.jsdelivr.net/npm/specpulse/...`), que serve arquivos de
  pacotes publicados. Quando houver repositório, dá para trocar pela URL do GitHub e tirar a
  imagem do `files`.
- CI GitHub Actions (`.github/workflows/ci.yml`): Node 22 e 24 × `ubuntu-latest` e
  `windows-latest`, disparo em `push` e `pull_request`, `permissions: contents: read`;
  `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm build`, smoke test
  `node dist/cli.js --cwd examples/basic --no-render` e `pnpm test:pack`.
- Release (`.github/workflows/release.yml`): só `workflow_dispatch` (com `dry-run`, padrão
  ligado) ou tag `v*`; nunca em push comum. `permissions: contents: read, id-token: write`.
  Confere que a tag bate com a versão do `package.json`, roda check, build e `test:pack`, depois
  `npm publish --provenance --access public`. Funciona com trusted publishing do npm (OIDC, sem
  token; exige npm ≥ 11.5.1, instalado no próprio job); a alternativa com o secret `NPM_TOKEN`
  está comentada no arquivo.
- Versionamento SemVer; `CHANGELOG.md` no formato Keep a Changelog, mantido à mão. Primeira
  versão pública: `0.1.0`.
- Teste de pacote (`pnpm test:pack` = `node scripts/pack-test.ts`, depois do `pnpm build`):
  confere a lista de arquivos do tarball e a ausência de dependências de runtime, roda
  `npm pack` num diretório temporário, instala o `.tgz` num projeto novo
  (`npm install --no-audit --no-fund`, sem rede porque não há dependências), roda
  `npx specpulse --version`, gera o painel numa cópia de `examples/basic` e importa a API
  (`generate`, `loadConfig`, `buildModel`, `specpulse/package.json`). Limpa tudo no fim
  (`KEEP_PACK_TEST=1` mantém a pasta para inspeção).

## Decisões

- **Nome no npm:** `specpulse` (confirmado pelo dono).
- **Repositório:** ainda não existe. Não inventar URL: `repository`, `homepage`, `bugs` e a URL
  absoluta da imagem do README entram quando o dono criar o repositório (passo 3 da checklist).
- **Changelog manual** (Keep a Changelog), sem changesets: zero dependências novas, inclusive de
  desenvolvimento.
- **Provenance só no workflow.** `provenance: true` em `publishConfig` faria um `pnpm publish`
  local (fora do GitHub Actions, sem OIDC) falhar; por isso o `--provenance` é passado só no
  `release.yml` e o `publishConfig` tem apenas `access: "public"`.

## Checklist de publicação (só quando o dono pedir)

1. `git rev-parse --abbrev-ref HEAD` = `main`, árvore limpa, `pnpm check`, `pnpm build` e
   `pnpm test:pack` verdes.
2. Dono confirma que o nome está livre (`npm view specpulse` deu 404 em 2026-10-28) e a URL do
   repositório.
3. Dono cria o repositório no GitHub e autoriza `git remote add` + `git push`. No mesmo passo:
   `repository`, `homepage` e `bugs` no `package.json` e URL absoluta da imagem do README.
4. Dono faz `npm login` ou configura trusted publishing (npmjs.com → pacote → Trusted publisher:
   o repositório e `release.yml`) — o agente não faz login.
5. Atualizar versão e `CHANGELOG.md` (`[Unreleased]` → `[0.1.0] - AAAA-MM-DD`, link de
   comparação), commit `chore(release): 🔖 v0.1.0`, tag `v0.1.0`.
6. Publicar pelo workflow de release (push da tag, ou manual com `dry-run` desligado) — com
   provenance. Alternativa local com o dono: `pnpm publish --access public` (sem provenance).
7. Conferir `npx specpulse@0.1.0 --version` num diretório limpo.

## Fora do escopo

- Executar qualquer passo da checklist sem pedido explícito.

## Primeira publicação local (feita pelo dono em 2026-10-28: `0.1.0` é a `latest`)

O trusted publishing só se configura com o pacote já existente, então a `0.1.0` sai da máquina
do dono, sem repositório e sem provenance. O agente deixou versão, CHANGELOG e README prontos;
build e publish são do dono:

1. `pnpm install && pnpm check && pnpm build && pnpm test:pack`
2. `npm publish --dry-run` (confere a lista de arquivos e a versão)
3. `npm publish` (`publishConfig` já dá `access: public`; pede o código do 2FA)
4. `npx specpulse@0.1.0 --version` num diretório limpo
5. Opcional: `git tag v0.1.0`. Depois de criar o repositório, configurar o trusted publisher
   (passo 4 da checklist) para as próximas versões saírem pelo `release.yml`.

## Critérios de aceite

- [x] `npm pack --dry-run --json` lista só os arquivos esperados (asserção em
      `scripts/pack-test.ts`; o pnpm 10.14 não tem `pack --dry-run`).
- [x] Teste instala o `.tgz` num diretório temporário e roda `specpulse --version` e uma geração.
- [ ] Workflows de CI e release escritos e validados com `actionlint` (se disponível) — sem push.
      Escritos e revisados à mão; `actionlint` não está instalado nesta máquina, então a
      validação fica para quando houver o binário ou para a primeira execução no GitHub.
- [x] `CHANGELOG.md` criado com a seção `Unreleased`.
- [ ] Checklist acima revisada pelo dono.
