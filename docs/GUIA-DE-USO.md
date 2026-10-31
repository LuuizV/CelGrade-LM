# Guia de uso — CelGrade LM

[Voltar à página principal](../README.md) · [Instaladores](https://github.com/LuuizV/CelGrade-LM-Releases/releases/latest)

Este guia descreve o fluxo básico do **CelGrade LM**, aplicativo local de planejamento de horários acadêmicos para Windows x64.

## 1. Instalar e iniciar

Baixe o arquivo `CelGrade-LM-Setup-<versão>.exe` na página oficial de [Releases](https://github.com/LuuizV/CelGrade-LM-Releases/releases/latest), instale e abra o programa. Para usá-lo, **não** é necessário instalar Node.js, Git ou um banco de dados separadamente.

Em uma migração de versão antiga, exporte um backup JSON antes de instalar a nova versão. O aplicativo utiliza a pasta de dados do usuário e normalmente preserva os cadastros entre atualizações.

## 2. Preparar os cadastros

Siga esta ordem sugerida:

1. **Períodos letivos:** crie ou escolha o semestre do ano em que trabalhará (por exemplo, `2027.1`).
2. **Salas:** cadastre os ambientes e suas disponibilidades.
3. **Professores:** cadastre quem leciona e os horários disponíveis.
4. **Disciplinas e turmas:** registre as disciplinas e as turmas ou etapas do curso.
5. **Ofertas:** associe disciplina, professor, turma, período e número de aulas por semana.
6. **Formandos:** quando necessário, cadastre as disciplinas de que cada estudante precisa no período e ative os que deverão ser considerados na análise.

**Conceitos diferentes:** uma *disciplina* pode ter mais de uma *oferta*; a *turma* representa uma etapa do curso; o *período letivo* representa o semestre do ano. O formando precisa de uma oferta compatível por disciplina, e não de todas as ofertas da mesma disciplina.

A opção **Carregar exemplo** é destinada a testes e substitui os cadastros após confirmação. Não a utilize sobre dados reais sem backup.

## 3. Entender a grade

O modelo atual possui seis aulas de 50 minutos, de segunda a sexta-feira:

| Aula | Horário |
| --- | --- |
| 1 | 07h30–08h20 |
| 2 | 08h20–09h10 |
| Intervalo | 09h10–09h20 |
| 3 | 09h20–10h10 |
| 4 | 10h10–11h00 |
| 5 | 11h00–11h50 |
| 6 | 11h50–12h40 |

O total semanal de uma oferta é informado como **quantidade de aulas de 50 minutos**. A grade não permite que a mesma sala, professor ou turma estejam em duas aulas simultâneas.

## 4. Gerar e revisar alternativas

No **Quadro de horários**, escolha o período e solicite a geração. O CelGrade LM procura alternativas e apresenta indicadores e avisos para revisão.

- Compare alternativas e verifique **conflitos**, **cargas incompletas**, **janelas de turmas** e **atendimento dos formandos**.
- Renomeie alternativas para facilitar sua identificação.
- Trave as aulas já aprovadas com o cadeado antes de gerar uma nova alternativa, quando desejar preservá-las.
- O resultado é uma **proposta**, não uma confirmação de matrícula nem uma prova de otimização global.

A busca é limitada e pode não encontrar uma distribuição adequada para todas as restrições. Quando necessário, reveja disponibilidades e ofertas ou ajuste a grade manualmente.

## 5. Ajustar aulas manualmente

A interface permite selecionar uma aula e clicar no destino ou utilizar o arraste. Também existem ações por teclado, como **Enter/Espaço** para selecionar e **Esc** para cancelar.

- **Verde:** movimentação válida, sem novo prejuízo identificado a formandos.
- **Amarelo:** requer confirmação porque pode prejudicar o atendimento de formandos ou porque a verificação não foi conclusiva.
- **Vermelho:** operação bloqueada; o motivo deve ser apresentado.

As aulas fixas precisam ser destravadas antes de serem movidas. Blocos duplos devem ser movimentados juntos. É possível escolher outra sala de destino, respeitando a disponibilidade e a ocupação. Para alterar somente a sala, a interface também oferece ação pelo botão direito (ou **Shift+F10**).

O recurso **Desfazer** cobre os últimos movimentos da sessão de edição, conforme as condições da tela. Para recuperar estados persistidos anteriormente, use o histórico na área de dados e backup.

## 6. Exportar para PDF

Confira a alternativa selecionada e escolha a visualização desejada (por turma, professor ou formando), então exporte o PDF. Quando existem conflitos ou cargas incompletas, o aplicativo solicita confirmação e identifica a exportação como **rascunho**.

Antes de compartilhar, abra o PDF para revisar nomes, horários, salas e eventuais pendências.

## 7. Backups e recuperação

Os dados ficam em um banco `celgrade.sqlite` na pasta do usuário, que pode ser aberta pelo comando **Pasta dos dados**.

- **Backup externo:** em **Dados e backup**, exporte um arquivo JSON e mantenha uma cópia protegida em outro local.
- **Histórico interno:** até 30 estados anteriores aos salvamentos podem ser recuperados. Esse histórico está no **mesmo banco** e não protege contra perda do dispositivo.
- **Restauração:** substitui os dados atuais pelos do backup ou estado escolhido. Confira o arquivo e confirme a operação conscientemente.
- **Atualização:** antes de instalar uma nova versão pelo atualizador, o programa tenta criar uma cópia JSON em `backups-atualizacao` na pasta de dados.

Não copie somente o arquivo SQLite com o aplicativo aberto, pois podem existir arquivos auxiliares WAL. Prefira a exportação JSON. Backups podem conter dados pessoais; não os publique em repositórios ou solicitações de suporte.

## 8. Atualizações e problemas comuns

O aplicativo instalado no Windows pode consultar novas versões. O download e a instalação requerem consentimento; sem internet o planejamento continua utilizável. Consulte [Atualizações](../ATUALIZACOES.md) para detalhes.

**Uma aula não pode ser movida:** confira a disponibilidade, os conflitos, o tamanho do bloco e se há um cadeado.

**O gerador não atende todas as ofertas:** verifique se a carga semanal cabe nos horários disponíveis de professores, salas e turmas. A busca é heurística e limitada.

**Os dados não apareceram após uma migração:** não sobrescreva novos dados sem verificar. Use o backup JSON exportado anteriormente ou procure a pasta de dados pelo aplicativo.

**Problemas com a aparência ou PDF:** informe a versão, a resolução/escala do Windows e os passos para reproduzir. Envie capturas sem dados pessoais. Veja [Como contribuir e relatar problemas](../CONTRIBUTING.md).
