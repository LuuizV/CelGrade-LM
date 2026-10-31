# CelGrade LM

<p align="center">
  <img src="web/brand-original.png" alt="Identidade visual do CelGrade LM, com jasmim" width="390">
</p>

<p align="center"><strong>Menos conflitos. Mais possibilidades.</strong></p>
<p align="center">Planejamento de horários acadêmicos em um aplicativo desktop, com geração assistida de grades e controle local dos dados.</p>

<p align="center">
  <a href="https://github.com/LuuizV/CelGrade-LM-Releases/releases/latest"><img src="https://img.shields.io/github/v/release/LuuizV/CelGrade-LM-Releases?label=vers%C3%A3o" alt="Última versão publicada"></a>
  <img src="https://img.shields.io/badge/plataforma-Windows%20x64-135F49" alt="Windows x64">
  <img src="https://img.shields.io/badge/dados-locais-135F49" alt="Dados locais">
  <a href="https://github.com/LuuizV/CelGrade-LM/actions/workflows/windows.yml"><img src="https://github.com/LuuizV/CelGrade-LM/actions/workflows/windows.yml/badge.svg" alt="Workflow de instalação e testes"></a>
</p>

<p align="center">
  <a href="https://github.com/LuuizV/CelGrade-LM-Releases/releases/latest"><strong>Baixar para Windows</strong></a> ·
  <a href="docs/GUIA-DE-USO.md">Guia de uso</a> ·
  <a href="docs/ARQUITETURA.md">Arquitetura</a> ·
  <a href="changelog.json">Histórico de versões</a>
</p>

## O projeto

Montar um quadro de horários acadêmicos exige conciliar disponibilidade de professores, salas, turmas, cargas semanais e necessidades dos estudantes. Alterar uma aula pode gerar conflitos em outra parte da grade e tornar inviável a combinação de disciplinas de um formando.

O **CelGrade LM** foi desenvolvido para apoiar esse processo: reúne cadastros em um único ambiente, propõe alternativas de horários, identifica incompatibilidades e permite que uma pessoa responsável revise o resultado antes de adotá-lo. O objetivo é **auxiliar a tomada de decisão**, não substituir a avaliação da coordenação ou garantir uma solução matematicamente ótima.

O sistema funciona como aplicativo local para **Windows x64**. Não exige servidor, conta online ou instalação de ferramentas de desenvolvimento para quem utiliza o instalador. A consulta de novas versões usa a internet; o planejamento e os cadastros permanecem disponíveis offline.

## Funcionalidades

| Área | O que o CelGrade LM oferece |
| --- | --- |
| **Planejamento** | Geração e comparação de alternativas para um período letivo, com diagnóstico de conflitos e de cargas incompletas. |
| **Cadastros** | Salas, professores, disciplinas, turmas, ofertas de disciplinas, períodos letivos e formandos. |
| **Restrições** | Verificação de disponibilidade e de sobreposição de professores, salas e turmas. |
| **Formandos** | Análise de compatibilidade entre as disciplinas necessárias e os horários das ofertas disponíveis. |
| **Revisão manual** | Movimentação e troca de aulas, escolha de sala, bloqueio de aulas aprovadas e avisos antes de alterações que possam prejudicar formandos. |
| **Alternativas** | Preservação e identificação de opções de grade para comparação. |
| **Exportação** | Exportação em PDF, incluindo indicação de rascunho quando há pendências. |
| **Proteção dos dados** | Banco SQLite local, backup em JSON e histórico de até 30 estados anteriores a salvamentos. |
| **Atualizações** | Verificação de versões e instalação mediante consentimento, com backup prévio à atualização. |

### Regras principais

- A grade atual contempla **segunda a sexta**, com **seis aulas de 50 minutos** entre **07h30 e 12h40**, incluindo intervalo de **09h10 a 09h20**.
- Uma mesma sala, turma ou professor não pode ocupar dois horários simultaneamente.
- A disponibilidade de professores e salas é obrigatória; a sala preferencial funciona como preferência.
- A carga semanal é expressa em **aulas de 50 minutos**, não em horas semestrais.
- O gerador considera aulas fixadas na alternativa selecionada e busca opções conforme as regras cadastradas.

As restrições e os limites atuais estão detalhados no [guia de uso](docs/GUIA-DE-USO.md).

## Instalação

1. Acesse a página de [versões oficiais](https://github.com/LuuizV/CelGrade-LM-Releases/releases/latest).
2. Baixe o arquivo **`CelGrade-LM-Setup-<versão>.exe`** correspondente à versão publicada.
3. Execute o instalador no **Windows x64**.
4. Abra o **CelGrade LM** pelo atalho criado e comece a cadastrar os dados ou restaurar um backup existente.

> **Atenção:** o instalador atualmente não possui assinatura digital Authenticode, portanto o Windows pode exibir um aviso de editor desconhecido. Confira se o arquivo veio do repositório oficial e siga as práticas de segurança da sua instituição. Não é necessário desativar proteções do Windows.

**Migrando de uma versão antiga?** Faça um backup em **Dados e backup** antes de atualizar. A versão portátil 0.3 exige migração para o instalador; siga as orientações do [repositório de downloads](https://github.com/LuuizV/CelGrade-LM-Releases). Os dados ficam em uma pasta de usuário separada da pasta do programa.

## Primeiros passos

1. Cadastre ou selecione o **período letivo**.
2. Informe **salas e professores** e suas disponibilidades.
3. Cadastre **disciplinas e turmas**.
4. Crie as **ofertas** associando disciplina, professor, turma, período e carga semanal.
5. Se necessário, cadastre **formandos** e suas disciplinas para analisar compatibilidade de horários.
6. Gere alternativas no **Quadro de horários**, revise os avisos, fixe aulas aprovadas e ajuste a grade.
7. Exporte o PDF e salve um backup externo dos dados.

Para movimentações, critérios de cores, backups, recuperação e resolução de problemas, leia o [Guia de uso](docs/GUIA-DE-USO.md).

## Tecnologias e desenvolvimento

| Camada | Tecnologia |
| --- | --- |
| Aplicativo desktop | Electron |
| Linguagem e regras | TypeScript |
| Interface | HTML, CSS e JavaScript compilado |
| Persistência | SQLite local (`node:sqlite`) |
| Atualização e instalador | `electron-updater` e NSIS via `electron-builder` |
| Testes | Node.js Test Runner e JSDOM |

Para desenvolver, é necessário **Node.js 24** e npm:

```bash
npm ci
npm test
npm start
```

Para gerar o instalador em Windows:

```bash
npm run package:win
```

Os comandos de desenvolvimento podem baixar dependências. O instalador distribuído ao usuário já inclui o necessário para executar o aplicativo.

Consulte a [arquitetura técnica](docs/ARQUITETURA.md), as [orientações para contribuições](CONTRIBUTING.md) e a [documentação de atualizações](ATUALIZACOES.md).

## Dados, privacidade e recuperação

Os cadastros e as grades são armazenados em um arquivo **`celgrade.sqlite`** na pasta de dados do usuário. O sistema não usa um serviço de sincronização de cadastros em nuvem. O aplicativo pode se conectar ao GitHub para consultar novas versões.

O histórico interno mantém até **30 estados anteriores a salvamentos**. Como ele fica no mesmo banco, **não substitui backup externo**. Prefira **Dados e backup → Exportar backup JSON** para cópias de segurança. Um backup pode conter nomes e informações de formandos: não o anexe a issues públicas.

## Escopo e limitações

O gerador utiliza **heurística com busca limitada**: não garante o melhor horário global nem que toda solução viável será encontrada. Ainda não contempla, entre outros pontos, múltiplos turnos, feriados, alternância quinzenal, capacidade de salas, matrículas, vagas ou uso simultâneo por vários computadores.

O projeto está em evolução. Resultados e PDFs devem ser conferidos por quem organiza os horários antes de sua adoção institucional. Os testes automatizados não substituem a validação prática no Windows.

## Projeto e documentação

- **Código e desenvolvimento:** [LuuizV/CelGrade-LM](https://github.com/LuuizV/CelGrade-LM)
- **Instaladores e versões oficiais:** [LuuizV/CelGrade-LM-Releases](https://github.com/LuuizV/CelGrade-LM-Releases)
- **Registro de mudanças:** [`changelog.json`](changelog.json), utilizado pelo histórico de versões do aplicativo.
- **Notas de avaliação anteriores:** [`REVISAO-E-TESTES.md`](REVISAO-E-TESTES.md) — documento histórico da etapa 0.3.

**Autoria:** Luiz Jirardi, Marcus Filho.

### Licenciamento

Este repositório ainda **não possui um arquivo de licença de software**. O fato de o código estar visível publicamente no GitHub não significa, por si só, que seu uso, modificação ou redistribuição por terceiros estejam autorizados. Uma licença poderá ser definida pelo responsável pelo projeto.
