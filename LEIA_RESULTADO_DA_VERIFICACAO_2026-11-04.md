# Verificação de recuperação — 04/11/2026

Este pacote reúne integralmente os arquivos de código, testes, recursos e documentação presentes no MANOBRA-main.zip enviado pelo usuário nesta conversa. Não foi possível recuperar alterações que eventualmente existiam apenas em uma conversa anterior inacessível. Nenhuma correção adicional de código foi aplicada nesta recuperação.

## Testes executados nesta recuperação
- `node --test tests/ability_limits_all.test.js`: passou.
- `node --test tests/judge_failover.test.js`: falhou por timeout aguardando reserva assumir.
- `node --test tests/map2_balance.test.js`: falhou por divergência de quantidade de especiais no cenário de chefão (act=1, floor=8, type=boss; esperado 6, obtido 0).

**Não é uma versão 100% validada.** As pendências acima exigem análise e correção antes de publicar como lançamento estável.

## Como colocar no GitHub
Extraia o ZIP e envie seu conteúdo diretamente à raiz do repositório, preservando `.github/`. Faça backup ou commit da versão atual antes de substituir os arquivos. O ZIP não contém uma pasta `MANOBRA-main` externa.
