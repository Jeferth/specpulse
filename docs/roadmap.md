# specpulse · Roadmap

Ordem das melhorias. Cada linha aponta para uma spec em `docs/specs/`; marque os critérios de
aceite lá conforme forem cumpridos.

## Feito (base, 0.0.0)

- Gerador genérico configurável (`specpulse.config.json`), CLI (`--cwd`, `--config`, `--open`,
  `--serve`, `--no-render`), i18n en/pt-BR, schemas JSON, build para `dist/`, testes.

## Próximos

| Ordem | Spec                                                     | Por quê agora                                         |
| ----- | -------------------------------------------------------- | ----------------------------------------------------- |
| 1     | [S-001](specs/S-001-layout-com-navbar-e-visoes.md) Layout com navbar e visões | Base de UI para tudo que vem depois (inclui a visão Ao vivo). |
| 2     | [S-002](specs/S-002-ao-vivo-com-watch-e-sse.md) Ao vivo (watch + SSE)          | Painel atualiza sozinho enquanto agentes trabalham.   |
| 3     | [S-003](specs/S-003-visao-ao-vivo.md) Visão Ao vivo                            | Commits, arquivos, check e sessões do Claude (opt-in). |
| 4     | [S-004](specs/S-004-skill-do-claude.md) Skill do Claude                        | Agente mantém o arquivo de dados certo.               |
| 5     | [S-005](specs/S-005-servidor-mcp.md) Servidor MCP                              | Status e atualização por ferramenta, sem editar JSON. |
| 6     | [S-008](specs/S-008-adaptadores-de-spec.md) Adaptadores de spec                | Abre o pacote para projetos com outro formato.        |
| 7     | [S-009](specs/S-009-specpulse-init.md) `specpulse init`                        | Primeiro uso em segundos.                             |
| 8     | [S-007](specs/S-007-migracao-do-draftly.md) Migração do Draftly                | Roteiro documentado; execução quando o dono quiser.   |
| 9     | [S-006](specs/S-006-pronto-para-publicar.md) Pronto para publicar              | CI, changelog e checklist; publicar só com pedido.    |

S-007 pode ser feita a qualquer momento (é só documentação); a execução da migração no Draftly
fica melhor depois de S-001 e S-002, para o painel novo já ser um ganho claro.

## Decisões abertas (dono)

- Nome final no npm (`specpulse` livre?) e URL do repositório.
- Changesets ou changelog manual.
- Locale padrão `en` para o público; o Draftly usa `pt-BR` pela config.
- MCP sem SDK (zero dependências) ou com `@modelcontextprotocol/sdk`.
