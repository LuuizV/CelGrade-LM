# Arquitetura técnica — CelGrade LM

[Voltar ao README](../README.md) · [Documentação de atualizações](../ATUALIZACOES.md)

## Visão geral

O CelGrade LM é um aplicativo **desktop local**, desenvolvido em **TypeScript** e distribuído com **Electron** para Windows x64. A interface usa HTML/CSS/JavaScript, as regras de negócio são executadas localmente e a persistência utiliza SQLite via `node:sqlite`. Não há serviço de backend remoto para grades e cadastros.

```text
Interface (web/index.html, web/style.css, src/renderer.ts)
                  |
        Ponte segura do Electron
             (src/preload.ts)
                  |
        Processo principal (src/main.ts)
            |                  |
    Regras e validação     Armazenamento local
       (src/core.ts)        (src/storage.ts)
                                   |
                          celgrade.sqlite (SQLite)

Atualização do instalador: src/updates.ts -> GitHub Releases
```

A representação é simplificada: parte das regras também é usada na interface para revisar e propor modificações; o processo principal valida os dados antes de persistir.

## Estrutura do repositório

| Arquivo/diretório | Responsabilidade |
| --- | --- |
| `src/core.ts` | Modelos de dados, validações, regras de horários, geração de alternativas e análise de formandos. |
| `src/renderer.ts` | Navegação, cadastros, quadro de horários e interações do usuário. |
| `src/preload.ts` | API controlada de comunicação entre interface e processo principal. |
| `src/main.ts` | Inicialização do Electron, janela, IPC, exportação PDF, acesso a arquivos e integração com a persistência. |
| `src/storage.ts` | Leitura/gravação no SQLite, transações, estados de recuperação e preferências. |
| `src/updates.ts` | Consulta, download e instalação consentida das atualizações, incluindo backup prévio. |
| `web/` | Página, estilos, identidade visual e recursos usados pela interface. |
| `scripts/` | Preparação dos recursos web, geração de ícone e empacotamento Windows. |
| `tests/` | Testes de regras, regressão, interface simulada, atualização e histórico de versões. |
| `changelog.json` | Fonte do histórico de alterações exibido pelo aplicativo. |
| `.github/workflows/` | Fluxos de validação e geração do instalador. |

## Persistência, integridade e recuperação

O banco fica na pasta `userData` definida pelo Electron, com o nome `celgrade.sqlite`. A implementação usa tabelas para o documento de estado, preferências e pontos de recuperação; **o estado acadêmico é persistido como documento JSON dentro do SQLite**, e não como uma tabela relacional separada para cada entidade.

Antes de salvar, os dados são validados. As gravações usam transações e controle de revisão para reduzir o risco de sobrescrever uma alteração mais recente. Os últimos **30 estados anteriores** são retidos na tabela de recuperação.

O histórico interno **não é backup off-site**. Usuários devem exportar JSON para cópia externa. Arquivos reais com nomes de formandos não devem fazer parte de exemplos, testes, issues ou commits públicos.

## Regras de geração

O período utiliza uma grade semanal de segunda a sexta, com seis aulas de 50 minutos por dia. O sistema verifica ocupação e disponibilidade de professores, salas e turmas; salas preferenciais e atendimento de formandos participam da avaliação das alternativas.

A geração usa **heurística com backtracking limitado** e compara soluções encontradas. Não garante otimização global, nem exaustividade em problemas muito restritos. O atendimento de formandos verifica compatibilidade de horários das ofertas, **não** efetivação de matrícula, vagas ou pré-requisitos.

## Segurança e limites

- A interface utiliza `contextIsolation: true`, `nodeIntegration: false` e `sandbox: true`.
- A janela bloqueia navegação arbitrária e abertura de outras janelas pelo conteúdo.
- Atualizações usam `electron-updater` com origem no repositório público de distribuições; download e instalação são controlados pelo usuário.
- O aplicativo não depende de conexão para cadastros e grades, mas verifica atualizações quando há internet.
- Ainda não há sincronização multiusuário nem assinatura digital Authenticode do instalador.

Esses controles não substituem auditoria de segurança ou teste de homologação.

## Ambiente de desenvolvimento

Requer **Node.js 24**, npm e, para empacotar o instalador, um ambiente Windows.

```bash
npm ci
npm test
npm start
npm run package:win
```

O comando `npm test` compila o projeto e executa os testes. O workflow `.github/workflows/windows.yml` instala dependências, testa e gera um artefato de instalador; isso não significa que a release pública seja publicada automaticamente por esse workflow.

## Versionamento e distribuição

1. Atualizar a versão em `package.json` e `package-lock.json`.
2. Registrar a mesma versão em `changelog.json`.
3. Executar testes e gerar o instalador.
4. Validar instalação, migração de dados, PDF e atualização em Windows.
5. Publicar a release pública com o instalador `.exe`, seu `.blockmap` e o `latest.yml`.

O repositório [CelGrade-LM-Releases](https://github.com/LuuizV/CelGrade-LM-Releases) abriga os instaladores e o feed de atualização. Existem também workflows de publicação por versão nesse repositório; consulte [ATUALIZACOES.md](../ATUALIZACOES.md) antes de criar uma nova publicação.

A publicação de uma nova versão do aplicativo **não é necessária** para corrigir somente a documentação.
