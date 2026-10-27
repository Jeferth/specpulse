# S-006 · Pronto para publicar

## Objetivo

Deixar o pacote pronto para o npm e o GitHub, com a publicação em si executada **só quando o dono
pedir**.

## Comportamento

- `package.json`: `repository`, `homepage`, `bugs` (com a URL que o dono escolher),
  `publishConfig: { access: "public", provenance: true }`, `files` revisado, `sideEffects: false`
  onde couber. Conferir com `pnpm pack --dry-run` que o tarball só tem `dist/`, `schema/`,
  `skills/`, `README.md`, `LICENSE`, `package.json`.
- README: imagem com URL absoluta (o npm não resolve caminho relativo do repo).
- CI GitHub Actions (`.github/workflows/ci.yml`): Node 22 e 24, Linux e Windows, `pnpm install
  --frozen-lockfile`, `pnpm check`, `pnpm build`, smoke test `node dist/cli.js --cwd examples/basic`.
- Release (`.github/workflows/release.yml`): disparo manual ou por tag `v*`, `npm publish
  --provenance` com `id-token: write`; nunca em push comum.
- Versionamento SemVer; `CHANGELOG.md` no formato Keep a Changelog, mantido à mão ou com
  changesets (decisão do dono). Primeira versão pública: `0.1.0`.
- Teste de pacote: `pnpm pack`, instalar o `.tgz` num diretório temporário e rodar o bin.

## Checklist de publicação (só quando o dono pedir)

1. `git rev-parse --abbrev-ref HEAD` = `main`, árvore limpa, `pnpm check` e `pnpm build` verdes.
2. Dono confirma nome no npm (`npm view specpulse` deve dar 404) e a URL do repositório.
3. Dono cria o repositório no GitHub e autoriza `git remote add` + `git push`.
4. Dono faz `npm login` (ou configura trusted publishing) — o agente não faz login.
5. Atualizar versão e `CHANGELOG.md`, commit `chore(release): 🔖 v0.1.0`, tag `v0.1.0`.
6. Publicar pelo workflow de release (provenance) ou `pnpm publish --access public` com o dono.
7. Conferir `npx specpulse@0.1.0 --version` num diretório limpo.

## Fora do escopo

- Executar qualquer passo da checklist sem pedido explícito.

## Critérios de aceite

- [ ] `pnpm pack --dry-run` lista só os arquivos esperados.
- [ ] Teste instala o `.tgz` num diretório temporário e roda `specpulse --version` e uma geração.
- [ ] Workflows de CI e release escritos e validados com `actionlint` (se disponível) — sem push.
- [ ] `CHANGELOG.md` criado com a seção `Unreleased`.
- [ ] Checklist acima revisada pelo dono.
