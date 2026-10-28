# S-010 · Specs em pasta (spec-kit, Kiro, OpenSpec)

## Objetivo

Ler, sem conversão, projetos que guardam **uma spec por pasta**, como fazem o
[spec-kit](https://github.com/github/spec-kit) (`specs/001-nome/{spec,plan,tasks}.md`), o Kiro
(`.kiro/specs/<nome>/{requirements,design,tasks}.md`) e o OpenSpec
(`openspec/changes/<id>/{proposal,tasks}.md`). O progresso vem dos checkboxes que essas
ferramentas já marcam no `tasks.md`.

## Comportamento

- Novo valor `specs.format: "folder"`. Cada subpasta direta de `specs.dir` é uma spec; arquivos
  soltos em `specs.dir` são ignorados.
- **ID** = nome da pasta (`001-photo-albums`, `user-auth`). `idFrom` não se aplica.
- **Título**: primeiro H1 do primeiro arquivo que existir entre `spec.md`, `requirements.md`,
  `proposal.md`, `README.md` (sem diferenciar maiúsculas). Com `Prefixo: Nome`
  (`Feature Specification: Photo Albums`, `Change: Add 2FA`) fica só o nome. Título genérico
  (`Requirements Document`, `Requirements`, `Tasks`, `Implementation Plan`, `Proposal`, `Design`)
  ou ausente → nome da pasta legível (`001-photo-albums` → `Photo albums`).
- **Critérios**: checkboxes do `tasks.md` (`[x]` e `[X]`, aninhados também); sem `tasks.md`,
  os do arquivo de título. `acceptanceHeading` continua valendo dentro desse arquivo.
- **Grupos**: cada critério guarda o H2 sob o qual está (`Phase 3: User Story 1 …`,
  `1. Implementation`). A página da spec mostra os critérios agrupados quando há grupos.
- Pasta sem nenhum desses arquivos (ex.: `openspec/changes/archive/`) não é spec.
- **Commits**: com `folder`, um commit cita a spec quando o assunto ou o corpo contém o nome da
  pasta como palavra inteira (merge da branch `001-photo-albums`, `feat: … (001-photo-albums)`).
  O `idPattern` não é usado para commits nesse formato (`\d{3}` pegaria qualquer número).
- `specpulse init` detecta `specs/*/`, `.kiro/specs/*/` e `openspec/changes/*/` com esses
  arquivos e grava `specs.dir` + `format: "folder"`, quando não houver specs planas com ID.
- `--serve` já observa `specs.dir` recursivamente: editar `tasks.md` atualiza a página.

## Fora do escopo

- Ler `plan.md`/`design.md`, constituição, histórias, `FR-001`/`SC-001` ou o `**Status**` do
  spec-kit; arquivar mudanças do OpenSpec; integração com o gstack (fica para outra spec).
- Mapear cada pasta a um marco automaticamente: continua no arquivo de dados.

## Critérios de aceite

- [x] Adaptador puro com testes para os layouts do spec-kit, Kiro e OpenSpec (título, ID,
      critérios, grupos, pasta vazia, `acceptanceHeading`).
- [x] Commits citam a spec pelo nome da pasta, sem casar trechos de outras palavras.
- [x] `specpulse init` detecta os três layouts, com testes.
- [x] Página da spec mostra os critérios agrupados por fase.
- [x] Schema, README e Guia (en, pt-BR, es) explicam o formato e a config de cada ferramenta.
- [x] `examples/spec-kit/` permite testar à mão.
