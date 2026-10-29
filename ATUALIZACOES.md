# Atualizações — CelGrade LM 0.5

O instalador NSIS usa o feed público LuuizV/CelGrade-LM-Releases. O código fica em LuuizV/CelGrade-LM. Nenhum token é distribuído ao usuário.

Ao iniciar a versão instalada no Windows, consulta versões estáveis. O download exige confirmação. A instalação exige clique em Instalar e reiniciar e nova confirmação. Fechar normalmente não instala. Sem conexão, o programa continua disponível; use Verificar atualizações para tentar novamente.

Antes da instalação, salva JSON completo em backups-atualizacao, dentro da pasta de dados. Falha no backup impede a instalação. Os arquivos de recuperação não são apagados automaticamente. O banco permanece na pasta de dados do aplicativo, com o mesmo nome de produto da versão 0.3.

## Publicar uma versão

1. Aumentar version em package.json e package-lock.json e adicionar a entrada correspondente no início de changelog.json. O build exige o histórico atualizado e gera a identificação visual automaticamente.
2. Executar npm ci, npm test e npm run package:win em Windows.
3. Testar o instalador em uma máquina Windows com backup dos dados.
4. Criar um rascunho de Release no repositório público, tag v seguida da versão.
5. Anexar os três arquivos gerados juntos: instalador .exe, .exe.blockmap e latest.yml. Não editar o checksum nem trocar apenas o executável.
6. Publicar como versão estável somente após todos os anexos terminarem.

O workflow do repositório privado gera os arquivos como artefato. A publicação no segundo repositório é manual: o GITHUB_TOKEN de um repositório não concede acesso de escrita a outro. Isso evita incorporar credenciais pessoais e evita publicar builds não revisados.

## Limitações e validação

A 0.3 portátil precisa ser substituída uma vez pelo instalador. O fluxo real de reinstalação entre duas versões exige teste em Windows. Testes simulados verificam consentimento e backup, mas não substituem esse teste. O instalador inicial não tem certificado Authenticode; o Windows pode exibir editor desconhecido. Não desative proteções do Windows. Assinatura de código pode ser configurada futuramente com certificado do responsável.

O repositório fonte privado não é uma proteção contra engenharia reversa: aplicativos Electron distribuem JavaScript compilado dentro do pacote, que pode ser inspecionado. Dados reais e backups nunca devem ser enviados aos repositórios.

## Histórico dentro do aplicativo

O botão da versão abre o histórico completo incluído no instalador, disponível offline. Na primeira abertura de uma nova versão, o histórico é exibido automaticamente. Fechar a janela (inclusive com Escape) registra a versão vista na tabela preferences do SQLite; esse registro não modifica grades nem entra no histórico de recuperação. Na primeira instalação desse recurso, mostra a versão atual. Ao pular versões, expande todas as entradas posteriores à última versão vista. Restaurar um backup JSON não redefine a leitura.
