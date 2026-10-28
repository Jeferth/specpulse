# S-003 · Visão "Ao vivo": commits, arquivos, check e sessões do Claude Code

## Objetivo

Uma visão que mostra o trabalho acontecendo agora: o que mudou no repo, o resultado do último
check e, se o dono quiser, o que as sessões do Claude Code estão fazendo neste projeto.

## Comportamento

- Depende de S-002 (SSE). Só existe com `--serve`.
- **Feed de commits**: últimos N commits (hash, assunto, hora relativa, specs citadas), novos
  entram no topo com destaque breve.
- **Arquivos alterados agora**: `git status --porcelain` agrupado por pasta, atualizado a cada
  mudança; mostra também os arquivos tocados nos últimos 10 minutos.
- **Resultado do check**: config opcional `live.check` (ex.: `"pnpm -s check"`). O servidor roda
  o comando quando o dono clica "rodar check" ou, se `live.checkOnChange: true`, após mudanças
  (com debounce longo e nunca em paralelo). Mostra status, duração e as últimas linhas da saída.
- **Sessões do Claude Code (opt-in)**: com `live.claudeSessions: true` ou `--claude-sessions`,
  lê **somente leitura** os transcripts JSONL locais em `~/.claude/projects/<pasta-do-projeto>/`
  (a pasta é o caminho do projeto com separadores trocados por `-`). Mostra por sessão: início,
  última atividade, ferramentas usadas recentemente (nome + arquivo alvo) e mensagens de commit.
- **Privacidade**: desligado por padrão; nunca envia nada para fora da máquina; não mostra o
  texto dos prompts nem respostas, só metadados (ferramenta, caminho de arquivo dentro do
  projeto, horário); caminhos fora do projeto são ocultados; nada disso é gravado no
  `index.html` estático nem no `outDir`. Aviso visível na visão explicando o que é lido.

## Fora do escopo

- Controlar sessões (enviar prompts), ler transcripts de outros projetos, outros agentes além do
  Claude Code (pode virar adaptador depois).

## Critérios de aceite

- [x] Feed de commits e arquivos alterados atualizam via SSE.
- [x] `live.check` roda sob demanda, nunca em paralelo, e mostra status e saída truncada.
- [x] Sem opt-in, nenhum arquivo em `~/.claude` é aberto (teste com diretório falso).
- [x] Com opt-in, o parser de JSONL extrai só metadados; teste garante que texto de prompt não vaza.
- [x] Nada da visão Ao vivo aparece no `index.html` gerado sem `--serve`.
- [ ] README documenta o opt-in e o que é lido.

## Notas de implementação

- `--claude-sessions` (ou `live.claudeSessions`) liga a leitura; a pasta é o caminho do projeto com
  todo caractere não alfanumérico trocado por `-` (`src/claude-sessions.ts`).
- Do transcript só saem: nome da ferramenta, caminho de arquivo dentro do projeto, horário e
  assunto de `git commit`. Texto de prompt, resposta, entradas de ferramenta (comandos inteiros,
  conteúdo de edições) e resultados nunca são copiados.
- Arquivos tocados nos últimos 10 minutos = mtime dos arquivos do `git status` + arquivos dos
  commits dos últimos 10 minutos.
- `live.check` roda com `src/io/check.ts`: um por vez; pedido durante uma execução enfileira
  exatamente mais uma.
