# Atualizações e distribuição — CelGrade LM

[Voltar ao README](README.md) · [Repositório de instaladores](https://github.com/LuuizV/CelGrade-LM-Releases)

## Como funciona para o usuário

O **CelGrade LM** utiliza `electron-updater` e um instalador Windows NSIS. O aplicativo instalado verifica versões estáveis publicadas em **LuuizV/CelGrade-LM-Releases**. O download exige consentimento; a instalação também exige a confirmação do usuário. Fechar o aplicativo normalmente **não instala** uma versão baixada.

Antes de instalar, o programa cria um backup JSON completo em `backups-atualizacao` dentro da pasta de dados do usuário. Se a criação do backup falhar, a instalação não prossegue. Os backups não são apagados automaticamente.

Sem conexão, o aplicativo continua disponível para planejar horários. A consulta de versões é a parte que depende da internet.

O banco permanece na pasta de dados do usuário, separada da pasta do instalador. Ainda assim, é recomendável exportar e guardar um backup externo antes de atualizar. A antiga distribuição portátil 0.3 exige migração para o instalador.

## Organização dos repositórios

- **[CelGrade-LM](https://github.com/LuuizV/CelGrade-LM):** código-fonte, testes, changelog, workflows de build e documentação.
- **[CelGrade-LM-Releases](https://github.com/LuuizV/CelGrade-LM-Releases):** instaladores, metadados de atualização e releases públicas.

O `GITHUB_TOKEN` gerado para um repositório não deve ser presumido como credencial de escrita no outro. Não inclua tokens, certificados privados ou bancos de dados reais no instalador ou no Git.

## Publicar uma nova versão (responsável técnico)

1. Atualize `version` em `package.json` e `package-lock.json`; inclua a nova entrada no início de `changelog.json`.
2. Em Windows, execute `npm ci`, `npm test` e `npm run package:win`.
3. Valide a instalação e a atualização numa máquina Windows, preferencialmente com dados fictícios e backup externo.
4. Confira os três artefatos: `CelGrade-LM-Setup-<versão>.exe`, `CelGrade-LM-Setup-<versão>.exe.blockmap` e `latest.yml`.
5. Publique-os **juntos** na tag `v<versão>` do repositório de releases. Não altere manualmente o checksum de `latest.yml` nem substitua apenas o executável.

O workflow [`windows.yml`](.github/workflows/windows.yml) do repositório principal executa testes e gera artefatos, mas **não publica por si só** uma release no segundo repositório. O repositório de downloads também contém workflows de publicação **específicos por versão**, que recompilam um commit do código-fonte fixado e podem publicar diretamente uma release quando executados. Antes de uma nova versão, revise qual procedimento será utilizado para evitar publicações duplicadas ou não verificadas.

**Alterações apenas na documentação não exigem novo instalador nem mudança de versão.**

## Histórico de versões dentro do aplicativo

O histórico é incluído no instalador a partir de `changelog.json`. Ao abrir uma versão ainda não visualizada, o aplicativo pode apresentar as alterações; o registro local da última versão lida fica nas preferências do SQLite e não altera as grades acadêmicas.

## Limitações e cuidados

O instalador não possui, até o momento, certificado digital Authenticode. O Windows pode exibir aviso de editor desconhecido; não oriente usuários a desativar proteções do sistema.

A atualização entre duas versões precisa ser validada na prática. Os testes automatizados verificam parte do fluxo, mas não substituem testes do instalador no Windows.

Backups e nomes de formandos são dados potencialmente pessoais: **nunca** os envie para os repositórios ou para issues públicas. O aplicativo Electron distribui JavaScript compilado que pode ser inspecionado; tornar o repositório privado, por si só, não impede engenharia reversa.
