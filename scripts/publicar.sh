#!/bin/bash
# Publica no servidor o que estiver no GitHub, se for diferente do que já está.
#
# Uma implementação só, com dois gatilhos:
#   - o GitHub Actions, logo depois do push — rápido, quando funciona;
#   - o cron do servidor, de 5 em 5 minutos — a rede de segurança.
#
# Em 06/08/2026 três publicações seguidas falharam sem culpa do código: duas
# vezes o GitHub não arrumou máquina para o job ("The job was not acquired by
# Runner of type hosted") e uma vez a conexão do runner até a VPS caiu por
# timeout, sem que nada chegasse ao sshd daqui. Nos três casos publicar virou
# trabalho manual, que é justamente o que o deploy automático existe para evitar.
#
# Com o servidor puxando, nada disso importa: o pior caso passa a ser cinco
# minutos de atraso, e não uma publicação que não acontece.
#
#   publicar.sh       silencioso quando não há nada novo — é assim que o cron usa
#   publicar.sh -v    fala sempre
#
# Idempotente e com trava: rodar duas vezes ao mesmo tempo não faz mal.
#
# ATENÇÃO ao chamar: copie para outro lugar e rode a cópia. O bash lê o script
# aos poucos enquanto executa, e este script atualiza a própria pasta — trocar o
# arquivo debaixo do interpretador corrompe a execução no meio.

set -uo pipefail

APP=/var/www/banco-questoes
REF=${REF:-master}
PORTA=8098
TRAVA=/var/lock/publicar-englishforall.lock
# Guarda o commit cuja publicação falhou. Sem isso o cron reencontraria o mesmo
# commit quebrado a cada cinco minutos e reiniciaria o serviço para sempre.
MARCA=/var/lib/publicar-englishforall.falhou

FALA=0
[ "${1:-}" = "-v" ] && FALA=1

diz() { [ "$FALA" = 1 ] && echo "$@"; return 0; }
conta() { echo "[$(date -u '+%Y-%m-%d %H:%M:%S') UTC] $*"; }

exec 9>"$TRAVA"
if ! flock -n 9; then
  diz 'outra publicação em andamento; saindo'
  exit 0
fi

cd "$APP" || { conta "ERRO: $APP não existe"; exit 1; }

if ! git fetch --quiet --prune origin "$REF" 2>/dev/null; then
  conta 'ERRO: não consegui falar com o GitHub (fetch)'
  exit 1
fi

antes=$(git rev-parse HEAD)
alvo=$(git rev-parse "origin/$REF")

if [ "$antes" = "$alvo" ]; then
  diz "nada novo (${antes:0:7})"
  exit 0
fi

if [ "$(cat "$MARCA" 2>/dev/null)" = "$alvo" ]; then
  diz "o commit ${alvo:0:7} já falhou antes; não vou insistir até vir outro"
  exit 0
fi

conta "publicando ${antes:0:7} -> ${alvo:0:7}"

# backup antes de mexer em qualquer coisa
NODE_PATH="$APP/node_modules" /usr/local/bin/node20 scripts/backup.js >/dev/null 2>&1

# --ff-only de propósito: se o servidor divergiu do GitHub, PARA em vez de
# sobrescrever. Nada de reset --hard — ele apagaria em silêncio o que houvesse
# de diferente aqui.
if ! git merge --ff-only "origin/$REF" >/dev/null 2>&1; then
  conta 'ERRO: merge --ff-only recusado — o servidor divergiu do GitHub. Resolva à mão.'
  git status --short | head -10
  echo "$alvo" > "$MARCA"
  exit 1
fi

# Só mexe em dependências se o package-lock tiver mudado.
#
# O npm PRECISA rodar com o node20. O better-sqlite3 é módulo nativo: compilado
# contra o node v22 do PATH, deixa de carregar no v20 que a aplicação usa, o
# serviço entra em laço de reinício e o site cai. Aconteceu em 06/08/2026.
if ! git diff --quiet "$antes" HEAD -- package-lock.json package.json; then
  conta 'dependências mudaram; instalando com o node20'
  mkdir -p /tmp/n20bin && ln -sf /usr/local/bin/node20 /tmp/n20bin/node
  PATH=/tmp/n20bin:$PATH npm ci --omit=dev >/dev/null 2>&1
  rm -rf /tmp/n20bin

  # prova que o módulo carrega ANTES de reiniciar: com ele quebrado, reiniciar
  # troca um site velho no ar por um site fora do ar.
  if ! NODE_PATH="$APP/node_modules" /usr/local/bin/node20 -e "require('better-sqlite3')" 2>/dev/null; then
    conta 'ERRO: better-sqlite3 não carrega no node20. NÃO vou reiniciar — o site segue no ar com o código anterior.'
    git reset --hard "$antes" >/dev/null 2>&1
    echo "$alvo" > "$MARCA"
    exit 1
  fi
fi

systemctl restart banco-questoes

codigo=
for _ in $(seq 1 15); do
  codigo=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORTA/" || true)
  if [ "$codigo" = "200" ]; then break; fi
  sleep 2
done

if [ "$codigo" != "200" ]; then
  conta "ERRO: o site não respondeu 200 (último: ${codigo:-nenhum}). Voltando para ${antes:0:7}."
  # Desfaz o que este script acabou de fazer, e só isso: o merge --ff-only saiu
  # de `antes` com a árvore limpa, então voltar para lá não apaga trabalho de
  # ninguém. Ficar parado deixaria o site fora do ar até alguém perceber.
  git reset --hard "$antes" >/dev/null 2>&1
  systemctl restart banco-questoes
  sleep 3
  volta=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORTA/" || true)
  conta "depois de voltar, o site responde: ${volta:-nenhum}"
  echo "$alvo" > "$MARCA"
  journalctl -u banco-questoes --no-pager --lines 25
  exit 1
fi

rm -f "$MARCA"
conta "publicado: $(git rev-parse --short HEAD) — site respondeu 200"
