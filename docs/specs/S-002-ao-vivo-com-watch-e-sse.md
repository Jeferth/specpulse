# S-002 · Ao vivo de verdade no --serve (watch + SSE)

## Objetivo

Com `specpulse --serve`, o painel aberto no navegador se atualiza sozinho quando specs, docs,
arquivo de dados ou git mudam, sem recarregar a página.

## Comportamento

- O servidor observa (`node:fs.watch`, recursivo onde houver suporte; polling como fallback):
  roadmap, arquivos de fase, pasta de specs, arquivo de dados, pasta da galeria, `.git/HEAD`,
  `.git/refs/` e `.git/index`.
- Mudanças são agrupadas (debounce ~300 ms); o servidor reconstrói o modelo (sem rodar render) e
  publica em `GET /events` (Server-Sent Events) um evento `model` com o JSON completo e um
  evento `activity` com o que mudou (arquivos, commit novo).
- `GET /model.json` devolve o modelo atual; o cliente usa no primeiro carregamento e após
  reconectar.
- O cliente troca só os dados e re-renderiza a visão atual, preservando hash, scroll, filtros e
  `<details>` abertos. Indicador "ao vivo" no header (verde conectado, cinza reconectando).
- Render da galeria continua sob demanda: botão "renderizar agora" chama `POST /render`
  (só em 127.0.0.1, com token por sessão gerado no start e embutido na página).
- `index.html` estático (sem `--serve`) segue funcionando igual, sem indicador.

## Fora do escopo

- Acesso remoto, autenticação além do token local, websockets.

## Critérios de aceite

- [ ] Editar um `- [ ]` para `- [x]` numa spec atualiza a barra no navegador em < 2 s, sem reload.
- [ ] Commit novo aparece no rodapé e nas specs citadas sem reload.
- [ ] Perder e recuperar a conexão reconecta sozinho e reaplica o modelo.
- [ ] Servidor só escuta em 127.0.0.1; `POST /render` sem token devolve 403.
- [ ] Debounce e diff de "o que mudou" são funções puras com teste.
- [ ] Teste Playwright: página aberta, arquivo alterado, DOM atualizado sem navegação.
