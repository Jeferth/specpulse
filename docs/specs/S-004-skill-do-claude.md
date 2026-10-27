# S-004 · Skill do Claude para manter o arquivo de dados

## Objetivo

Que um agente (Claude Code) mantenha o arquivo de dados correto sozinho: ao concluir uma spec ou
um marco, ele atualiza o JSON no mesmo commit, sem adivinhar status.

## Comportamento

- `skills/specpulse/SKILL.md` no pacote (incluído em `files`), com frontmatter `name` e
  `description` acionável ("use ao concluir spec ou marco, ao criar spec nova, ao aprovar imagem").
- Conteúdo: onde está a config, formato do arquivo de dados, regras (status manual só com
  `source`; marco com specs não recebe `status`; nunca marcar imagem como aprovada sem o dono),
  como conferir (`specpulse --no-render` e ler o resumo) e exemplos de diff.
- `specpulse --summary` imprime um resumo em texto curto (fase atual, marcos, specs abertas com
  critérios faltando) para o agente ler sem abrir HTML.
- `specpulse skill install [--project|--user]` copia a skill para `.claude/skills/specpulse/` do
  projeto ou do usuário; não sobrescreve sem `--force`.
- README ganha a seção "Using with Claude Code".

## Fora do escopo

- MCP (S-005), outros agentes (o SKILL.md serve de base para eles).

## Critérios de aceite

- [ ] `SKILL.md` existe, vai no pacote e passa num lint simples de frontmatter.
- [ ] `--summary` tem teste de snapshot com o `examples/basic`.
- [ ] `skill install` cria a pasta, recusa sobrescrever sem `--force` e é testado com diretório temporário.
- [ ] Teste manual documentado: numa sessão do Claude Code, concluir uma spec de exemplo e ver o
      agente atualizar o arquivo de dados.
