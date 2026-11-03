# CelGrade LM — laboratório da árvore de Backtracking

Branch experimental: `experimental/arvore-busca`. Esta edição não altera a branch `main` nem as releases estáveis.

## Como usar

Na aba **Actions** do GitHub, selecione **Laboratorio da Arvore - Windows**, execute ou abra um build concluído na branch experimental e baixe o artefato `CelGrade-LM-Laboratorio-Arvore`. Extraia o ZIP e execute o EXE portátil no Windows. Não é um instalador nem uma release estável.

Os dados do laboratório são guardados numa pasta separada, `CelGrade LM Laboratorio` dentro de AppData. O programa experimental **não acessa automaticamente** os cadastros da versão estável e não oferece atualização automática. Para usar seus dados, exporte backup JSON da edição estável e importe uma cópia na experimental.

No Quadro de Horários, clique em **Gerar outra alternativa**. O painel abrirá automaticamente. Use os controles de velocidade, Pausar animação e Próximo passo. O botão **Árvore da busca** permite reabrir o painel. Pausar animação **não pausa** o cálculo real em outro processo; o botão Cancelar busca interrompe o cálculo.

O monitor exibe eventos reais amostrados: os primeiros 32 nós e aproximadamente um a cada 90 nós posteriormente. Ele mostra até 18 níveis recentes do caminho e não é um registro exaustivo de até 150 mil nós por fase. Os estados recebidos são animados para permitir inspecionar mesmo buscas rápidas. As métricas não devem ser usadas como benchmark da versão estável, pois existe sobrecarga adicional.

**Privacidade:** o repositório GitHub é público; o código e builds experimentais não são privados. Não envie backups reais, nomes de formandos ou cadastros para issues ou artefatos do GitHub. Use dados fictícios ao compartilhar capturas.
