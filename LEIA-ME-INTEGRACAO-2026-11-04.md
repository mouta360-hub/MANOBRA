# Integração de correções — 04/11/2026

Base: MANOBRA-PROJETO-COMPLETO-RECUPERADO.zip.
Sobrepostos: tests/support_rewards.test.js (Ímã Tático); www/tourlink.js, www/tournament.js, www/app.js, tests/judge_failover.test.js (Juiz Reserva).

## Verificações realizadas nesta integração
- tests/judge_failover.test.js: PASSOU (5 cenários).
- tests/support_rewards.test.js: FALHOU na linha 28: teste espera bloqueio de captura pelo Ímã Tático, mas o motor retornou true. Possível divergência de versão entre patch e base. **Não validado**.
- tests/tournament.test.js: exibiu três testes OK, mas processo não encerrou em 18 s (timeout). Não classificado como sucesso total.
- Outros testes e balanceamento do Mapa 2 não foram revalidados nesta integração.

Este pacote é uma integração de arquivos, NÃO uma versão certificada ou totalmente corrigida. Faça backup e teste em branch antes de substituir a versão principal no GitHub.
