# specpulse · Roadmap

Ordem das melhorias. Cada linha aponta para uma spec em `docs/specs/`; marque os critérios de
aceite lá conforme forem cumpridos.

## Feito (base, 0.0.0)

- Gerador genérico configurável (`specpulse.config.json`), CLI (`--cwd`, `--config`, `--open`,
  `--serve`, `--no-render`), i18n en/pt-BR, schemas JSON, build para `dist/`, testes.

## Feito (2026-10-28)

Todas as specs foram implementadas. O que ainda depende do dono está em "Pendências".

| Spec                                                                     | Estado                                                       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| [S-001](specs/S-001-layout-com-navbar-e-visoes.md) Layout com visões     | feito (+ visão Guia trilíngue e idioma `es`)                |
| [S-002](specs/S-002-ao-vivo-com-watch-e-sse.md) Ao vivo (watch + SSE)    | feito                                                        |
| [S-003](specs/S-003-visao-ao-vivo.md) Visão Ao vivo                      | feito                                                        |
| [S-004](specs/S-004-skill-do-claude.md) Skill do Claude                  | feito; falta o teste manual numa sessão do Claude Code       |
| [S-005](specs/S-005-servidor-mcp.md) Servidor MCP                        | feito; falta registrar no Claude Code e consultar (manual)   |
| [S-008](specs/S-008-adaptadores-de-spec.md) Adaptadores de spec          | feito                                                        |
| [S-009](specs/S-009-specpulse-init.md) `specpulse init`                  | feito                                                        |
| [S-007](specs/S-007-migracao-do-draftly.md) Migração do Draftly          | roteiro e teste prontos; falta a revisão do dono             |
| [S-006](specs/S-006-pronto-para-publicar.md) Pronto para publicar        | `0.1.0` publicada no npm; falta repositório e actionlint     |

## Pendências (dono)

- Criar o repositório (destrava `repository`/`homepage`/`bugs`, a imagem absoluta do README e o CI).
- Revisar a checklist de publicação (S-006) e o roteiro de migração (S-007).
- Testes manuais da skill (S-004) e do MCP no Claude Code (S-005).
- Validar os workflows com `actionlint` (não instalado nesta máquina).

## Decisões (dono)

- ~~Nome final no npm~~ → `specpulse` (confirmado). URL do repositório: **pendente** (o dono ainda
  não criou o repositório; `repository`/`homepage`/`bugs` e a imagem absoluta do README esperam).
- ~~Changesets ou changelog manual~~ → changelog manual (`CHANGELOG.md`, Keep a Changelog), sem
  dependência nova.
- ~~Locale padrão~~ → `en` para o público; o Draftly usa `pt-BR` pela config.
- ~~MCP com ou sem SDK~~ → sem SDK (JSON-RPC por stdio escrito à mão, zero dependências).
