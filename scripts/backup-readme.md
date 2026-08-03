# Backup — English for ALL

Cópia de segurança do banco de questões publicado em
**https://ingles.destruitor.com.br**.

Gerado automaticamente em **{{DATA}} UTC**. Cada envio **substitui** o anterior:
aqui fica sempre a cópia mais recente. O histórico dos últimos 14 dias fica no
servidor, em `/var/backups/banco-questoes/diarios`.

Conteúdo desta cópia: **{{QUESTOES}} questões**, **{{USUARIOS}} usuários**,
**{{SIMULADOS}} simulados**, **{{RESPOSTAS}} respostas** de alunos.

---

## ⚠️ Antes de tudo: a senha

Os arquivos estão cifrados com **AES-256**. A senha está em
`/root/.backup-senha` no servidor, e numa cópia que o professor guardou fora
dele.

**Sem essa senha nada aqui abre** — nem eu, nem o GitHub, nem ninguém. Se o
servidor morreu e a senha só existia lá, estes {{TAMANHO}} MB são inúteis.

---

## O que tem aqui

| arquivo | tamanho | origem |
|---|---|---|
{{TABELA}}

- **banco.db** — o acervo inteiro, as contas dos alunos e o histórico de simulados
- **sessoes.db** — quem estava logado; pode ser descartado sem prejuízo
- **uploads.tar.gz** — as imagens das questões (`public/uploads/`)
- **banco-mensal.db** — a primeira cópia do mês corrente

### O código-fonte NÃO está aqui

Está em **https://github.com/Julioamancio/EnglishforALL** (repositório público).
Este guarda só o dado. Para reconstruir, você precisa dos dois.

---

## Abrir um arquivo

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in banco.db.enc -out banco.db -pass file:CAMINHO_DA_SENHA
```

Confira antes de confiar:

```bash
sqlite3 banco.db "PRAGMA integrity_check;"        # tem que dizer: ok
sqlite3 banco.db "SELECT COUNT(*) FROM questoes;"
```

Senha errada não devolve banco: o openssl falha com `bad decrypt`. Se ele
falhar assim, é senha errada — não backup corrompido.

---

## Restaurar num servidor que ainda existe

**Não sobrescreva `dados/banco.db` com o serviço no ar.** O SQLite roda em modo
WAL: as escritas vivem em `banco.db-wal`, e copiar por cima do `.db` não desfaz
nada — o banco antigo volta a valer. Isso já custou uma questão danificada em
produção.

Use o script do projeto, que para o serviço e apaga o `-wal` e o `-shm`:

```bash
node scripts/restaurar.js --conferir                    # sempre comece por aqui
node scripts/restaurar.js --restaurar CAMINHO/banco.db
```

**Restaurar o arquivo inteiro desfaz tudo o que os alunos fizeram desde este
backup.** Para estrago pontual — uma questão, um usuário — leia o valor certo
daqui e conserte só aquilo, em vez de voltar o banco todo.

---

## Servidor perdido: subir do zero

1. Instale Node 20 e clone **https://github.com/Julioamancio/EnglishforALL**
2. `npm ci`
3. Decifre `banco.db.enc` para `dados/banco.db`
4. Decifre `uploads.tar.gz.enc` e extraia dentro de `public/`
5. Crie o `.env` a partir do `.env.example`. Dois campos precisam ser **gerados
   de novo** — eles nunca entram no backup, de propósito:
   - `SESSION_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `ADMIN_SENHA_HASH`: `npm run senha "a nova senha"`
6. `node scripts/audita-sanidade.js` — tem que fechar em zero
7. Suba o serviço com `deploy/banco-questoes.service`

As contas dos alunos vêm dentro do banco e continuam valendo. A senha do painel
do professor é a que você gerar no passo 5.

---

## Como este backup é feito

No servidor, por cron:

| hora | o que roda |
|---|---|
| 03:15 | `scripts/backup.js` — cópias locais |
| 03:25 | `scripts/backup-remoto.js` — cifra e envia para cá |

A cópia usa a **API de backup online do SQLite**, nunca `cp`. Em modo WAL,
copiar o arquivo com o serviço no ar produz uma cópia em que **nem a tabela
existe** — testado. Cada cópia passa por `integrity_check` antes de ser aceita.

Este repositório recebe um **commit órfão com push forçado** a cada envio: a
história é recriada do zero e o repositório nunca cresce. É de propósito —
backup precisa apagar o velho, e o Git foi feito para nunca apagar.

O servidor usa **duas chaves SSH**: uma deploy key só vale para um repositório
em todo o GitHub, então há `id_ed25519_github` (projeto) e `id_ed25519_backups`
(este). O apelido `github-backups` no `~/.ssh/config` escolhe a segunda.

`scripts/audita-backup.js`, no projeto, prova num banco descartável que a cópia
e a restauração funcionam.
