# CelGrade LM 0.5

Atualizações automáticas com consentimento e instalador Windows. Consulte [ATUALIZACOES.md](ATUALIZACOES.md) para instalação, publicação e limitações.

# CelGrade LM — versão 0.3 de avaliação

Aplicativo local para planejar horários acadêmicos. Interface e regras em TypeScript, desktop Electron, dados em SQLite. O pacote Windows contém tudo para utilizar o programa sem instalar ferramentas de desenvolvimento.

## Abrir e atualizar

1. Na versão antiga, exporte um backup em **Dados e backup**.
2. Feche o CelGrade LM.
3. Extraia TODO o ZIP da versão 0.3 para uma pasta nova.
4. Entre em `CelGrade-LM-win32-x64` e abra `CelGrade-LM.exe`.

O banco continua na mesma pasta de dados do usuário; mudar a pasta do executável não deve apagar os cadastros. O aplicativo mantém o nome interno `celgrade-lm`. O backup JSON da versão 0.2, inclusive a grade convertida 2026.2, permanece compatível. Se for usar outro computador, restaure o backup.

Não execute o programa de dentro do ZIP nem copie só o `.exe`. Os demais arquivos são necessários. A distribuição é para Windows x64. Não há assinatura digital; o sistema pode exibir aviso de aplicativo não reconhecido.

## Melhorias desta versão

- **Geração mais eficiente:** ocupação de professores, salas e turmas verificada por máscaras de horários, evitando reexaminar a grade inteira a cada possibilidade.
- **Comparação de alternativas:** até seis tentativas por solicitação. Entre as alternativas diferentes encontradas, prioriza mais formandos totalmente atendidos, mais disciplinas atendidas, menos janelas nas turmas e menos aulas fora da sala preferencial, nessa ordem.
- **Diagnósticos iniciais:** identifica casos em que a carga de um professor excede sua disponibilidade ou a carga total excede a disponibilidade das salas.
- **Cancelar busca:** interrompe o processo de geração antes do salvamento, preservando as grades.
- **Amarelo mais preciso:** não pede confirmação apenas porque já existia uma pendência de formando sem relação com a alteração. Avisa sobre atendimento reduzido, novas pendências ou verificação inconclusiva.
- **Correções parciais:** um problema antigo em outra aula não impede consertar uma aula sem relação com ele. O resumo continua mostrando as pendências restantes.
- **Clique ou arraste:** selecione a aula e clique no destino, ou arraste. Enter/Espaço ativam a seleção; Esc cancela.
- **Sala de destino:** permite escolher outra sala para o movimento, validando sua disponibilidade e ocupação. A turma da oferta permanece a mesma.
- **Renomear alternativa:** permite identificar opções como “Revisada por Celina”.
- **Recuperação automática:** guarda os 30 estados anteriores aos salvamentos no SQLite, com data e motivo, e permite restaurá-los na tela Dados e backup.
- **PDF com alerta:** pede confirmação para exportar grade com conflitos ou cargas incompletas e a identifica como rascunho. A grade individual do formando informa pendências.
- **Código e testes:** organização do código TypeScript e 21 testes automatizados, incluindo interações com o DOM real da interface em ambiente simulado.

## Uso básico

1. Escolha/crie o **período letivo**, como 2026.2 ou 2027.1.
2. Cadastre salas e professores, marcando disponibilidade de segunda a sexta.
3. Cadastre disciplinas e turmas (nome, etapa do curso e sala preferencial).
4. Cadastre as **ofertas**: disciplina + professor + turma + período + carga semanal.
5. Cadastre formandos e suas disciplinas necessárias no período; ative os que devem ser considerados.
6. Em Quadro de horários, gere uma alternativa e examine o atendimento dos formandos.
7. Trave aulas aprovadas com o cadeado, faça ajustes e exporte o PDF da visualização desejada.

Uma disciplina pode ter várias ofertas. Um formando precisa de uma oferta compatível por disciplina, não de todas as ofertas. A aba Turmas representa a etapa do curso; o período letivo representa o semestre do ano.

Use Carregar exemplo apenas para testes: ele substitui os cadastros após confirmação.

## Regras de horários

| Aula | Horário |
|---|---|
| 1 | 07:30–08:20 |
| 2 | 08:20–09:10 |
| Intervalo | 09:10–09:20 |
| 3 | 09:20–10:10 |
| 4 | 10:10–11:00 |
| 5 | 11:00–11:50 |
| 6 | 11:50–12:40 |

Carga é quantidade inteira de aulas semanais de 50 minutos, não horas semestrais. Cada turma comporta até 30 aulas semanais. Professor, sala e turma não podem ter aulas simultâneas. Sala preferencial e atendimento de formandos são preferências; as disponibilidades são obrigatórias.

O gerador reorganiza todas as ofertas do período selecionado, preservando as aulas fixas da alternativa selecionada. Alternativas anteriores continuam guardadas. Matérias não ofertadas não são criadas automaticamente.

## Edição e cores

- **Verde:** movimento válido, sem novo prejuízo identificado para formandos.
- **Amarelo:** exige confirmação, indicando formandos afetados. Cancelar mantém a grade original.
- **Vermelho:** bloqueia a ação e mostra o motivo; a grade original permanece intacta.

O amarelo compara o atendimento anterior com o posterior. Se a verificação de combinações de um formando atingir seu limite, também alerta em vez de tratar como comprovadamente seguro.

Duplas se movem juntas e começam em 07:30, 09:20 ou 11:00. Trocas exigem blocos do mesmo tamanho e validam os dois lados. Destrave uma aula antes de movê-la. Para trocar a sala, selecione Sala de destino antes de indicar a célula.

Desfazer guarda os últimos 30 movimentos da sessão da grade. Trocar de grade, editar cadastro ou alterar cadeados limpa essa pilha; para recuperar estados mais antigos, use o histórico do banco.

Editar cadastros preserva as grades. Como a alteração pode invalidar uma grade, confira o resumo de conflitos e cargas. É possível corrigir problemas gradualmente, sem a presença de um erro distante bloquear um movimento válido. Nenhum problema é removido dos avisos apenas por ser antigo.

## Dados e recuperação

**Pasta dos dados** abre o diretório do `celgrade.sqlite`. Não copie só esse arquivo com o aplicativo aberto: o SQLite pode utilizar arquivos auxiliares WAL. Prefira Exportar backup JSON.

O histórico guarda os últimos 30 estados anteriores, inclusive antes de importar backup ou restaurar um estado. Na restauração, o estado substituído também é guardado. O histórico é local e fica no mesmo banco: **não substitui um backup externo em caso de perda ou corrupção do arquivo**.

Backup JSON inclui cadastros, formandos, períodos, alternativas e aulas fixas. A restauração substitui todo o conteúdo. Nomes de formandos são dados pessoais; compartilhe backups apenas com quem precisa utilizá-los.

O backup antigo do primeiro protótipo HTML (`grade-teste-v1`) ainda requer conversão. O backup já convertido para CelGrade LM é aceito diretamente.

## Limites conhecidos

- O gerador é uma heurística com backtracking limitado, não uma prova de otimização global.
- Cada tentativa tem orçamento aproximado de 3 segundos; até seis tentativas são comparadas dentro de um orçamento aproximado de 11 segundos, com corte externo em 16 segundos.
- A busca de ofertas por formando tem limite de nós e informa quando a verificação fica inconclusiva.
- Não há calendário de feriados, alternância quinzenal, aulas de outros turnos, pré-requisitos, capacidade de sala, vagas ou tempo de deslocamento entre prédios.
- Os pesos/prioridades de comparação ainda não são configuráveis pela interface.
- Não há acesso compartilhado simultâneo de vários computadores.
- Backup de até 10 MB; até 1.000 registros por coleção e 1.500 blocos por grade. Esses limites não garantem desempenho em todas as combinações.
- O banco persiste o documento de estado em SQLite; ainda não possui uma tabela relacional por entidade.

## Verificação

21 testes automatizados passaram: geração, cargas, disponibilidade, conflitos de três tipos, diversidade, cadeados, períodos, fallback para aulas isoladas, amarelo/vermelho, troca bidirecional, movimentos sem mutação indevida, edição por clique, renomeação, recuperação SQLite, reabertura e compatibilidade do esquema 0.2, além de auditoria independente de 30 grades e comparação do worker.

Os testes de interface executam o HTML/JavaScript real em JSDOM, com ponte desktop e diálogos simulados. **Não são uma inspeção visual do Electron no Windows.** O arraste nativo, a paginação final do PDF e a aparência em diferentes monitores precisam ser conferidos durante o uso real. O pacote não inclui dados reais utilizados na avaliação.

Leia `REVISAO-E-TESTES.md` para a autocrítica e um roteiro curto de avaliação.

## Desenvolvimento

Node.js 24 e npm são necessários apenas para desenvolver/empacotar:

```sh
npm ci
npm test
npm start
npm run package:win
```

Os comandos de instalação e empacotamento podem baixar dependências. O aplicativo pronto funciona offline. O empacotamento usa uma pasta temporária isolada, incluindo apenas arquivos compilados e interface, para evitar incorporar testes e dados pessoais.

- `src/core.ts`: domínio, validações, geração, qualidade e formandos.
- `src/storage.ts`: persistência e recuperação transacional.
- `src/main.ts`: janela Electron, PDF, backup e integração com SQLite.
- `src/preload.ts`: ponte limitada entre interface e processo principal.
- `src/renderer.ts`: interface, edição e interação.
- `scripts/build-web.cjs`: preparação dos scripts da interface e worker.
- `scripts/package-win.cjs`: empacotamento Windows x64.
- `tests/core.cjs`, `tests/regression.cjs`, `tests/dom.cjs`: testes automatizados.
