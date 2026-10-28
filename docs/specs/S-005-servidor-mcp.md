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

## Decisão: sem `@modelcontextprotocol/sdk`

O SDK oficial traria ~15 dependências de runtime transitivas (express, zod, ajv, cors, etc.),
contra a regra de zero dependências de runtime, para um servidor stdio que só precisa de
`initialize`, `ping`, `tools/list` e `tools/call`. O protocolo nesse recorte é pequeno: JSON-RPC
2.0 em linhas, negociação de `protocolVersion` (ecoa a do cliente se for `2025-11-25`,
`2025-06-18`, `2025-03-26` ou `2024-11-05`; senão responde a mais nova) e erros `-32700`,
`-32600`, `-32601`, `-32602`. O núcleo (`src/mcp/protocol.ts`) é uma função pura mensagem →
resposta, testada com um cliente fake. Custo: acompanhar mudanças do protocolo à mão. Reavaliar
se precisarmos de transporte HTTP, recursos, prompts, sampling ou notificações do servidor.

Escrita: `progress_update` só grava o `dataFile` configurado; reescreve o JSON com 2 espaços e
quebra de linha final (mantém CRLF se o arquivo usava). Quem escreveu entradas numa linha só
(`{ "specs": [...] }`) as verá expandidas na primeira edição; o conteúdo e a ordem ficam iguais.

## Fora do escopo

- Transporte HTTP, recursos/prompts MCP, autenticação.

## Critérios de aceite

- [x] Handshake `initialize` + `tools/list` + `tools/call` testados com um cliente fake em Vitest.
- [x] `progress_update` mantém o JSON idêntico fora do campo alterado (teste de round-trip pt e en).
- [x] `progress_update` recusa aprovar imagem e status manual sem fonte, com erro explicativo.
- [ ] Teste manual: registrar no Claude Code e consultar o status do `examples/basic`.

## Teste manual

1. `pnpm build`, depois registre no Claude Code apontando para o exemplo:
   `claude mcp add specpulse -- node <specpulse>/dist/cli.js mcp --cwd <specpulse>/examples/basic`
   (publicado: `claude mcp add specpulse -- npx specpulse mcp`).
2. `claude mcp list` deve mostrar `specpulse` conectado; em `/mcp` aparecem as três ferramentas.
3. Peça "qual o status do projeto?": o agente chama `progress_status` e responde fase 1 Core,
   marcos 1.1 (67%) e 1.2 (0%) e specs abertas APP-001/APP-002.
4. Peça "marque o marco 2.1 como feito" sem dizer a fonte: a ferramenta recusa e o agente pede a
   fonte. Depois de desfazer, `git diff examples/basic` deve estar vazio.
