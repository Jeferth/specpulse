# S-008 · Adaptadores de formato de spec

## Objetivo

Aceitar specs de outros projetos sem obrigar o formato `# ID · Título` + checkboxes: frontmatter
YAML, status declarado, IDs no nome do arquivo e checklists em seções específicas.

## Comportamento

- Config `specs.format`: `"markdown"` (atual, padrão), `"frontmatter"` ou `"auto"` (tenta
  frontmatter, cai para markdown).
- **markdown**: como hoje; nova opção `specs.acceptanceHeading` (ex.: `"Acceptance"`,
  `"Critérios de aceite"`) restringe a contagem aos checkboxes daquela seção.
- **frontmatter**: lê `id`, `title`, `status` (`done`/`doing`/`todo` e sinônimos), `milestone`
  do bloco `---` no topo (parser YAML mínimo próprio: escalares e listas simples; sem dependência).
  Se houver `status` e nenhum checkbox, o progresso vem do status.
- ID também pode vir do nome do arquivo (`specs.idFrom: "heading" | "filename" | "frontmatter"`).
- `milestone` no frontmatter dispensa listar a spec em `milestones.<id>.specs` no arquivo de dados
  (as duas fontes se somam; conflito vira aviso no painel).
- Adaptador é uma função pura `(md, file, config) => Spec | undefined`, registrada por nome, para
  facilitar adaptadores futuros (ex.: issues exportadas, Linear).

## Fora do escopo

- Ler specs de serviços remotos; YAML completo.

## Critérios de aceite

- [x] `format: "frontmatter"` lê `id/title/status/milestone` com testes (incluindo frontmatter inválido).
- [x] `acceptanceHeading` limita a contagem à seção certa.
- [x] `format: "auto"` escolhe por arquivo e é coberto por teste.
- [x] Schema JSON e README atualizados; `examples/` ganha um projeto no formato frontmatter.
