# CelGrade LM 0.3 — autocrítica e roteiro de testes

## O que estava fraco na versão 0.2

**A geração funcionava no exemplo pequeno, mas não havia sido dimensionada para a grade real.** Cada candidato acionava uma checagem de toda a grade. No ensaio feito com 104 aulas, a versão anterior esgotou cerca de 2,3 segundos sem solução. Após substituir a checagem por máscaras de horários, três ensaios equivalentes terminaram em 5–48 ms, sem conflitos ou cargas faltantes. Isso demonstra melhora nesse conjunto; não é promessa de tempo para qualquer instituição.

**O amarelo era excessivo.** Uma pendência antiga de um formando podia causar confirmação em movimentos que não o prejudicavam. Agora há comparação entre o atendimento anterior e o posterior. Ainda existe uma decisão de produto para discutir: se duas combinações atendem a mesma quantidade de disciplinas, Celina pode querer dar preferência a uma disciplina específica. A interface não possui esse peso por disciplina.

**A correção manual podia ficar bloqueada por um erro distante.** O validador exigia que a grade inteira estivesse perfeita antes de permitir um movimento. A versão 0.3 verifica a parte afetada pelo movimento, mantendo os outros problemas visíveis. Isso permite consertar uma grade progressivamente.

**A proteção contra erro humano era limitada.** O backup manual continua importante, mas agora cada salvamento guarda o estado anterior, até 30 versões. A gravação e o registro do histórico acontecem na mesma transação. Uma importação inválida ou revisão desatualizada não pode sobrescrever o banco. O histórico não é cópia de segurança em outro disco.

**O arraste era a única forma de movimentar aulas.** Agora também há clique de origem e destino, teclado e escolha de sala. Os testes simulados cobrem a lógica dessas interações, mas a avaliação visual com Celina ainda é necessária.

## O que melhorou sem ser uma garantia absoluta

O gerador compara até seis alternativas diferentes encontradas e escolhe a melhor segundo uma ordem fixa: mais formandos totalmente atendidos, mais disciplinas atendidas, menos janelas das turmas e menos aulas fora da sala preferencial. Ele não explora todas as combinações possíveis, portanto pode deixar de encontrar uma solução melhor ou até uma solução viável muito restrita.

A análise de formandos considera opções de oferta, mas não confirma matrícula, pré-requisitos, vagas, equivalências ou disponibilidade pessoal do aluno. Um resultado compatível significa apenas que os horários encontrados permitem assistir às disciplinas consideradas.

## Roteiro para Luiz, colega e Celina

Use uma cópia do backup real e guarde um backup anterior antes de começar.

1. **Atualização:** abrir a 0.3 após fechar a 0.2. Conferir nomes, cargas, salas e as 104 aulas da grade importada. Se necessário, restaurar o JSON convertido e escolher 2026.2.
2. **Alternativas:** gerar três alternativas, voltar à primeira, renomear cada uma e conferir se a escolhida continua selecionada. Comparar formandos atendidos e janelas, não apenas a aparência.
3. **Aulas fixas:** travar duas aulas, gerar novamente e verificar se permaneceram no mesmo dia, horário e sala.
4. **Vermelho:** tentar colocar um professor onde ele já ensina em outra turma. Conferir o motivo e verificar que nenhuma das duas aulas mudou.
5. **Amarelo:** cadastrar um formando com duas disciplinas de turmas distintas. Provocar choque entre elas, cancelar e conferir a grade; repetir, confirmar e conferir a pendência do aluno.
6. **Movimentação:** testar dupla, aula isolada, troca de blocos, escolha de sala e clique sem arraste. Testar Esc e Desfazer.
7. **Persistência:** fechar e reabrir o programa após uma alteração. Conferir que a mudança permaneceu.
8. **Recuperação:** editar um nome de teste e restaurar o estado anterior pelo histórico. Confirmar que as grades e cadastros voltaram juntos. Depois, se desejado, restaurar o estado que foi substituído.
9. **PDF:** exportar por turma, professor e formando. Abrir o arquivo e conferir cortes, quebra de página, nomes longos, salas e pendências. Experimentar uma grade incompleta para verificar a identificação de rascunho.
10. **Busca difícil:** restringir a disponibilidade de um professor abaixo da carga dele. Conferir o diagnóstico; em um caso de busca longa, clicar em Cancelar e verificar que a grade antiga permaneceu.

## Como relatar um problema

Anote a versão (0.3), o período selecionado, os passos, o resultado esperado e o que aconteceu. Se puder, envie um print e um backup de teste que reproduza o problema. Remova nomes de alunos quando não forem necessários para reproduzir.

## Prioridades após o feedback

- Ajustar a ordem de prioridades e permitir pesos escolhidos por Celina.
- Melhorar diagnóstico de conjuntos de restrições incompatíveis.
- Avaliar capacidade e tipo de sala, deslocamentos e disponibilidade de alunos, somente se fizerem parte da rotina real.
- Testar visualmente PDF e drag-and-drop em Windows e monitores reais.
- Considerar instalador assinado e atualizações automáticas quando o fluxo estiver estável.
