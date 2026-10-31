# Contribuindo com o CelGrade LM

Obrigado pelo interesse em melhorar o CelGrade LM. O projeto está em evolução e prioriza a **confiabilidade do planejamento**, a **clareza da interface** e a **proteção dos dados acadêmicos**.

## Relatar um problema

Abra uma [issue](https://github.com/LuuizV/CelGrade-LM/issues) e descreva:

1. Versão do aplicativo e versão do Windows.
2. O que estava tentando fazer.
3. Passos exatos para reproduzir o problema.
4. Resultado esperado e resultado observado.
5. Captura de tela, se necessário, **sem informações pessoais**.

**Não anexe** o banco `celgrade.sqlite`, backups reais, nomes completos de formandos ou dados institucionais a issues públicas. Caso precise reproduzir um problema, crie um conjunto **fictício** de teste.

## Sugerir melhorias

Explique a necessidade concreta, como ela ocorre no planejamento de horários e o resultado esperado. Se puder, inclua um exemplo com professores, salas, turmas e disciplinas fictícios.

## Preparar uma alteração

1. Descreva a proposta numa issue antes de fazer mudanças extensas.
2. Use Node.js 24 e execute `npm ci`.
3. Mantenha separadas as regras em `src/core.ts`, a interface em `src/renderer.ts` e a persistência em `src/storage.ts`.
4. Execute `npm test` e acrescente testes quando alterar regras ou corrigir defeitos.
5. Ao abrir um pull request, explique o objetivo, os testes executados e eventuais impactos na compatibilidade dos dados.

Mudanças que possam afetar backups, atualizações ou grades geradas exigem cuidado adicional e validação manual em Windows.

## Direitos de uso

O repositório ainda não possui uma licença explícita de software. **Código visível não equivale a autorização geral de cópia, modificação ou redistribuição.** Antes de reutilizar o código em outro produto ou projeto, obtenha autorização do responsável. Propostas e pull requests podem ser discutidos no GitHub, mas não estabelecem automaticamente uma licença para o projeto.
