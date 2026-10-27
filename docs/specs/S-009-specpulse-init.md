# S-009 · `specpulse init`

## Objetivo

Começar em um projeto novo em segundos: gerar config e arquivo de dados a partir do que já existe.

## Comportamento

- `specpulse init [--locale en|pt-BR]` procura roadmap, pastas de fase, pasta de specs e um padrão
  de ID plausível (pelos nomes de arquivo) e escreve `specpulse.config.json` só com o que difere
  dos defaults, mais um arquivo de dados vazio se não existir.
- Nunca sobrescreve arquivos existentes; imprime o que fez e o próximo comando.
- Sugere adicionar o `outDir` ao `.gitignore` (não edita sozinho).

## Fora do escopo

- Gerar roadmap ou specs de exemplo no projeto do usuário.

## Critérios de aceite

- [ ] Detecção (pura) testada com árvores de arquivos falsas (layout padrão, layout Draftly, nada).
- [ ] Não sobrescreve config nem arquivo de dados existentes (teste).
- [ ] README documenta o comando.
