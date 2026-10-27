# S-005 · Servidor MCP stdio (`specpulse mcp`)

## Objetivo

Expor o progresso como ferramentas MCP para que qualquer cliente (Claude Code, Claude Desktop,
outros) consulte e atualize o status sem editar JSON à mão.

## Comportamento

- `specpulse mcp [--cwd] [--config]` fala MCP por stdio (JSON-RPC 2.0, linhas), implementado com
  `node:*` apenas (sem SDK, para manter zero dependências; reavaliar se o protocolo exigir).
- Ferramentas:
  - `progress_status` → fase atual, marcos (status, progresso, fonte), specs abertas com critérios
    faltando. Parâmetros opcionais: `phase`, `spec`.
  - `progress_update` → altera o arquivo de dados: `{ milestone, status?, source?, specs?, note? }`
    ou `{ image, approved: false }`. Valida com `parseDataFile`, preserva chaves existentes, a
    língua das chaves (pt/en), `$comment` e a formatação (2 espaços). Recusa `approved: true`
    (aprovar imagem é do dono) e status manual sem `source`.
  - `progress_snapshot` → gera o HTML (equivale a `specpulse --no-render`) e devolve o caminho e
    o resumo.
- Descrições das ferramentas escritas para agentes (quando usar, o que não fazer).
- README documenta o registro no Claude Code (`claude mcp add specpulse -- npx specpulse mcp`).

## Fora do escopo

- Transporte HTTP, recursos/prompts MCP, autenticação.

## Critérios de aceite

- [ ] Handshake `initialize` + `tools/list` + `tools/call` testados com um cliente fake em Vitest.
- [ ] `progress_update` mantém o JSON idêntico fora do campo alterado (teste de round-trip pt e en).
- [ ] `progress_update` recusa aprovar imagem e status manual sem fonte, com erro explicativo.
- [ ] Teste manual: registrar no Claude Code e consultar o status do `examples/basic`.
