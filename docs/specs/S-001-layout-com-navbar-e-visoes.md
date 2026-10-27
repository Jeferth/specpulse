# S-001 · Layout com navbar e visões separadas

## Objetivo

Trocar o scroll único por um app de uma página com header fixo e visões separadas, para o painel
continuar legível quando o projeto tiver dezenas de fases, specs e imagens.

## Comportamento

- Header fixo com título do projeto, navbar e botão de tema. Visões: **Visão geral**, **Fases**
  (fases e marcos), **Specs**, **Galeria**, **Linha do tempo**, **Ao vivo**.
- Roteamento por hash (`#/overview`, `#/phases`, `#/phases/1`, `#/specs`, `#/specs/F-0001`,
  `#/gallery`, `#/timeline`, `#/live`). Funciona em `file://` (sem History API nem servidor).
  Hash desconhecido cai na Visão geral.
- **Visão geral**: KPIs, barra de progresso por fase, fase atual com seus marcos, últimas specs
  tocadas (por data do último commit) e imagens aguardando aprovação.
- **Specs**: tabela com filtro de texto e filtro por status (aberta/completa) e por marco;
  clique numa linha abre o detalhe (critérios, commits, arquivo).
- Visões sem dado (sem galeria configurada, sem `--serve`) somem da navbar em vez de aparecerem vazias.
  "Ao vivo" só aparece quando servido por `--serve` (ver S-002).
- Os dados vão embutidos uma vez no HTML como JSON (`<script type="application/json">`) e as
  visões são renderizadas no cliente por JS inline, sem framework e sem rede.
- Responsivo: navbar vira menu horizontal rolável abaixo de 720px; nada rola horizontalmente fora
  das tabelas. Tema claro/escuro por preferência do sistema, com o botão sobrepondo e lembrando a escolha.
- Teclado: `g o/f/s/g/t/l` navega entre as visões; foco visível.

## Fora do escopo

- Live/SSE (S-002), edição de dados pelo painel, gráficos com biblioteca.

## Critérios de aceite

- [ ] Header fixo com navbar e as seis visões; visão ativa marcada e refletida no hash.
- [ ] Abrir `index.html#/specs` direto (via `file://`) mostra a visão Specs.
- [ ] Visões sem dados não aparecem na navbar.
- [ ] Filtros de Specs funcionam e o detalhe de uma spec tem URL própria.
- [ ] HTML segue sem nenhuma requisição de rede (teste que procura `src=`/`href=` externos).
- [ ] Screenshots Playwright a 1280px e 400px, nos dois temas, sem rolagem horizontal do body.
- [ ] Renderização das visões testada como função pura (dados → HTML) no Vitest.
