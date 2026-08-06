# Retomar o trabalho em outra máquina ou em outra sessão

Este arquivo existe para o professor conseguir continuar de onde parou sem
depender do histórico de uma conversa. Ele tem duas partes:

1. **O que carregar** — as três coisas que não estão aqui, porque não podem
   estar: este repositório é público.
2. **O prompt** — o texto para colar como primeira mensagem da sessão nova.

---

## Parte 1 — o que você precisa levar

O repositório dá o código. Falta o acesso, e acesso não se versiona.

### A chave SSH do servidor

Está em `~/.ssh/id_ed25519` (e o `.pub` ao lado) na máquina onde o trabalho vem
sendo feito. **Nunca coloque esse arquivo no repositório, nem cole o conteúdo
dele numa conversa.**

Duas formas de ter acesso na máquina nova:

- **Levar a chave**: copie os dois arquivos por pendrive ou cofre de senhas para
  `~/.ssh/` da máquina nova. No Windows, se der erro de permissão, rode
  `icacls "%USERPROFILE%\.ssh\id_ed25519" /inheritance:r /grant:r "%USERNAME%:R"`.
- **Criar outra** (mais seguro, e não invalida a antiga):
  ```
  ssh-keygen -t ed25519 -C "maquina-nova"
  ```
  e depois instale a pública no servidor, a partir de uma máquina que já tenha
  acesso:
  ```
  ssh root@187.77.36.21 "echo COLE_A_CHAVE_PUBLICA_AQUI >> /root/.ssh/authorized_keys"
  ```

Para conferir se funciona: `ssh root@187.77.36.21 "hostname"` deve responder
`srv1359505` sem pedir senha.

### A conta do GitHub

Instale a CLI (`winget install GitHub.cli`) e rode `gh auth login --web`. É login
na sua conta — ninguém faz por você.

### O que **não** precisa levar

A senha de app do Gmail e os segredos do deploy vivem **no servidor** e **no
GitHub**, não na sua máquina. Máquina nova não precisa deles.

---

## Parte 2 — o prompt

Copie daqui até o fim do arquivo e cole como primeira mensagem.

---

Você vai trabalhar no **English for ALL** (`ingles.destruitor.com.br`): banco de
questões de inglês com área de aluno, simulado semanal e painel do professor.
Sou o professor e dono do projeto. O que segue foi aprendido na prática — leia
antes de agir, porque quase tudo aqui custou um erro.

### Onde as coisas estão

- **Repositório:** `Julioamancio/EnglishforALL`. Branch padrão **`master`**, não `main`.
- **Clone local:** se não existir, clone. O diretório de trabalho da sessão é
  `Downloads` e o repositório não fica lá por padrão.
- **Servidor:** `root@187.77.36.21`, aplicação em `/var/www/banco-questoes`.
- **A aplicação escuta na porta 8098.** A 8091 é **outro** aplicativo no mesmo
  servidor e responde 200 alegremente — testar nela dá tudo verde e é mentira.
  Descubra pelo processo:
  `ss -lntp | grep "pid=$(systemctl show banco-questoes -p MainPID --value),"`

### O deploy publica sozinho

Push na `master` dispara a Action, que faz `merge --ff-only`, instala
dependência só se o lock mudou, reinicia e **só fica verde depois de o site
responder 200**. Leva ~13 segundos. **Código quebrado vai ao ar sozinho — teste
antes de commitar.**

A `gh` CLI não está no PATH das janelas já abertas; use o caminho cheio em
`%LOCALAPPDATA%\Microsoft\WinGet\Packages\GitHub.cli_*\bin\gh.exe`.

**Se a Action falhar** (já aconteceu: timeout de SSH do runner e HTTP 500 da API
do GitHub), publique à mão — é o caminho documentado:

```
cd /var/www/banco-questoes && git fetch origin master && git merge --ff-only origin/master && systemctl restart banco-questoes
```

### Rodar coisa no servidor

O `node` do PATH é v22 e **quebra o better-sqlite3**. Use sempre:

```
ssh root@187.77.36.21 'cd /var/www/banco-questoes && NODE_PATH=/var/www/banco-questoes/node_modules /usr/local/bin/node20 scripts/<x>.js'
```

**Isto derrubou o site em 06/08/2026:** o `npm ci` do deploy rodava com o node
v22 e recompilou o better-sqlite3 para a versão errada; o serviço entrou em laço
de reinício. O deploy já foi corrigido para instalar com o node20 e provar que o
módulo carrega antes de reiniciar. Se um dia precisar consertar à mão:

```
mkdir -p /tmp/n20bin && ln -sf /usr/local/bin/node20 /tmp/n20bin/node
cd /var/www/banco-questoes && PATH=/tmp/n20bin:$PATH npm rebuild better-sqlite3
systemctl restart banco-questoes
```

### Armadilhas do PowerShell que já custaram tempo

1. **Barra invertida some no caminho até o bash.** `sed -i "s/\r$//"` virou
   `s/r$//` e passou a apagar a letra "r" do fim das linhas — foi assim que
   `master` virou `maste` e um deploy falhou. O mesmo com `tr -cd "\r"`, que
   virou `tr -cd "r"` e contou letras em vez de quebras. **Não converta quebra
   de linha no servidor: os arquivos chegam certos.**
2. **Comando remoto com aspas aninhadas falha.** Escreva num arquivo, mande com
   `scp`, rode por caminho.
3. **`git commit -m` com here-string quebra** quando a mensagem tem aspas. Use
   sempre `git commit -F arquivo.txt`.
4. **`Set-Content -Encoding utf8` grava BOM** e corrompe `.ejs`. Grave bytes com
   Python ou use a ferramenta Write.
5. **A ferramenta Edit converte o `estilo.css` inteiro para CRLF.** O arquivo tem
   quebras **misturadas** no repositório (~950 CRLF, ~430 LF); normalizar vira um
   diff de duas mil linhas e apaga o `git blame`. Edite com Python preservando o
   terminador de cada linha e confira que `git diff --stat` e
   `git diff --stat --ignore-cr-at-eol` dão o mesmo número.

### Regras que não se negociam

- **Nunca `git add -A`.** Adicione arquivo por arquivo, pelo nome.
- **O SQLite roda em WAL.** Copiar `dados/banco.db` dá backup incompleto, e
  restaurar por cópia **não desfaz nada**. Backup só por `node20 scripts/backup.js`.
- **Rode o backup antes de qualquer escrita no banco.**
- **Antes de mexer no `schema.sql`, teste numa cópia** — ele roda no boot da
  aplicação, e SQL errado derruba o site no restart.
- O importador de lote é **só INSERT**. Sobrescrever questão apagaria a revisão
  dos alunos.
- O banco tem nome, e-mail e hash de senha de **alunos, muitos menores**. Não
  despeje isso em log nem na conversa; para conferir, mascare.

### Duas coisas que só o professor pode fazer

Bloqueadas pela política da sessão — peça, não insista:

- instalar chave em `authorized_keys`;
- copiar arquivo para `public/uploads/` no servidor.

### Como se verifica trabalho aqui

- **Renderize a página antes de subir.** Copie `views/` para `/tmp/views` no
  servidor, sobrescreva só o que mudou e renderize com o `ejs` e dados reais.
  Pega erro de variável indefinida, que compilar não pega. Nunca escreva na
  árvore do projeto no servidor.
- **Meça, não olhe.** Para layout, leia `getBoundingClientRect` no navegador.
  Foi assim que apareceram 4px de desalinhamento entre campo e seletor, uma
  linha de tabela 23px mais alta por causa de um nome comprido, e uma classe CSS
  aplicada e sem efeito por especificidade.
- **Desconfie do verde.** Uma conferência inteira deu 200 porque batia na porta
  errada.

### Documentação do projeto

- `PADRAO-EDITORIAL.md` — o padrão que o acervo de fato segue. Não invente outro.
- `ESTADO-CURADORIA.md` — onde a curadoria parou, backup, como publicar.
- `conteudo/lotes/2026-08-vestibular/LEIA-ME.md` — o lote e as verificações
  cruzadas que pegam vazamento entre questões vizinhas.
- `scripts/audita-*.js` — verificadores permanentes; todos devem dar zero.

### Estado em 06/08/2026

| | |
|---|---|
| Questões no banco | 1.135 |
| Publicadas | 1.053 |
| **O que a página `/questoes` mostra** | **777** (só `colecao = ''`) |
| Alunos | 103 |
| Simulados concluídos | 77 |

**Cuidado com as três contagens.** Quando eu perguntar por que o número não
bate, é quase sempre isto: a listagem pública filtra `colecao = ''`; o resto está
em `use-of-english` e `reading`.

### Regras de negócio já implementadas

- **Nota do bimestre** (`src/lib/notas.js`): um simulado por semana, de
  `2026-W31` até a semana de 20/11/2026 — **17 no total**, obrigatório fazer
  **70% = 12**. Nota é a média das porcentagens, de 0 a 10, e **quem não fizer os
  12 fica com 0**. Aparece em `/admin/notas`, na ficha do aluno e em
  `/simulado/desempenho`. O início **não recua** mesmo que o bimestre tenha
  começado antes — decisão minha, já tomada.
- **Exercícios de gramática**: 60 testes de 10 questões num player de quiz, com
  cronômetro que conta para cima. Todas as questões vão no HTML do servidor; o
  player só esconde as que não são a atual, para o buscador ler tudo e a página
  funcionar sem JavaScript.

### O que ficou pela metade

**Aviso semanal por e-mail** (`scripts/aviso-semanal.js`). Existe porque dos 103
alunos, 75 fizeram um simulado e pararam, todos na aula em que se cadastraram —
ninguém voltou sozinho, e a nota exige 12.

O código está pronto e testado em simulação (28 alunos a avisar). **Falta a
credencial:** `SMTP_SENHA` no `.env` do servidor, com uma senha de app do Gmail
de 16 letras gerada em `myaccount.google.com/apppasswords`. O `SMTP_USER` já
está lá. Para conferir sem expor a senha:

```
cd /var/www/banco-questoes && NODE_PATH=/var/www/banco-questoes/node_modules /usr/local/bin/node20 -e "require('dotenv').config({quiet:true}); require('./src/lib/email').testar().then(r=>console.log(r))"
```

Com a credencial no lugar, o próximo passo é mandar **um** e-mail de teste para o
professor (`--para=`), e só depois disparar para a turma (`--enviar`).

Ideias já discutidas e ainda não feitas, em ordem de impacto: sequência de
semanas no simulado, resolver o abandono no meio (13 de 88 começaram e não
terminaram), selos por marcos, os personagens reagindo ao resultado, e ranking
**entre turmas** — nunca entre alunos, porque o próprio código registra que "a
comparação é do aluno com ele mesmo, não com os colegas".

### Como eu trabalho

- Escrevo rápido, em maiúsculas, com erro de digitação, e às vezes mudo de ideia
  no meio. Interprete a intenção e, se ela mudar, **descarte o que ia fazer**.
- **Não sei fazer as coisas técnicas.** Me dê um comando por vez, dizendo o que
  ele faz e o que devo ver na tela. O que der para você fazer, faça.
- Prefiro que você decida e me diga o porquê. Mas se for **nota de aluno,
  dinheiro ou apagar coisa**, pergunte antes.
- Quando eu reclamar que algo está feio ou esquisito, **meça antes de
  redesenhar** — nas duas vezes que isso aconteceu, era defeito concreto e não
  gosto pessoal.
