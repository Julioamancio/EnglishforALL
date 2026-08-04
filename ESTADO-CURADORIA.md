# Estado da curadoria — retomada

Documento de retomada: tudo o que é preciso para continuar a curadoria sem
depender do histórico da conversa. O que **deve** ser feito está no
`PADRAO-EDITORIAL.md`; aqui está **onde paramos e como se roda um lote**.

Atualizado em 31/07/2026, ao fim do lote 33 — **os lotes por id terminaram**.

## Onde paramos

- **Lote de vestibular de agosto/2026 importado em 04/08/2026.** As 72 questões
  novas entraram como ids **1067–1138**, todas publicadas; 6 do lote eram
  duplicatas e foram puladas. O banco principal (`colecao = ''`, que é o que a
  página `/questoes` lista) foi de **705 para 777**. Detalhe do que a curadoria
  encontrou em `conteudo/lotes/2026-08-vestibular/LEIA-ME.md`; o
  `scripts/audita-lote.js` refaz as verificações cruzadas do lote.
- **Lotes 1 a 33 concluídos: o acervo inteiro passou pela curadoria (IDs 1 a 1066).**
- Não há próximo lote por id. O que resta é o **lote de tipografia** (aspas retas) e a **pendência de direito autoral** registrada no §13 do padrão.
- Faltam **0 questões** por id.
- **1.053 questões publicadas** (eram 1.048; entraram a 493, a 734, a 831, a 1039 e a 1060).
- **Todas as provas foram curadas**: ITA, as duas PUC Minas, ENEM, Fuvest e os
  simulados. Os lotes 26, 27 e 33 fecharam com pouca ou nenhuma alteração de
  conteúdo, que é o estado esperado no fim — a partir do lote 27 o ganho passou a
  vir menos de reler os itens e mais de ampliar o que se verifica.

Recalcular a qualquer momento:

```bash
ssh root@187.77.36.21 "cd /var/www/banco-questoes; NODE_PATH=/var/www/banco-questoes/node_modules /usr/local/bin/node20 scripts/progresso-curadoria.js"
```

(editar a constante `ATE` do script para o último ID curado)

## Como rodar no servidor

Servidor `root@187.77.36.21`, chave SSH já configurada. O `node` padrão é v22 e
quebra o `better-sqlite3` compilado; **usar sempre o binário node20**:

```bash
cd /var/www/banco-questoes
NODE_PATH=/var/www/banco-questoes/node_modules /usr/local/bin/node20 <script>.js
```

Scripts de trabalho vão por `scp` para `/root/`. Os verificadores permanentes
ficam versionados em `scripts/`.

## O ciclo de um lote

1. **Dump** — `node /root/lote-grupo.js <ultimoId> 25` e ler as 25 questões
   inteiras: gabarito, comentário, texto-base, alternativas.
2. **Inspecionar antes de mexer** — script só de leitura para medir o que se
   suspeita (numeração, parágrafos, aparato, tipografia). Nunca corrigir no
   escuro.
3. **Script de correção** com `--dry`, dentro de transação, com verificação por
   multiconjunto de palavras (`chave()`): se qualquer palavra mudaria sem ser
   intencional, **ROLLBACK** e nada é gravado.
4. **Dry-run, ler a saída, só então gravar.**
5. `systemctl restart banco-questoes`.
6. **Auditorias** — rodar os sete verificadores; todos devem ficar em zero.
7. **Verificar no site** via curl: páginas 200, o defeito corrigido aparecendo
   certo, sitemap válido. O serviço escuta em **8098** (`PORT` do `.env`), e não
   em 8091 nem em 8096, como esta linha dizia até 04/08/2026 — a 8091 é de outro
   aplicativo no mesmo servidor, e testar ali devolve página 200 do projeto
   errado, o que já custou uma rodada inteira de conferência. Descobrir a porta
   pelo processo, não pela memória:
   `ss -lntp | grep "pid=$(systemctl show banco-questoes -p MainPID --value),"`
8. **Registrar** no `PADRAO-EDITORIAL.md` o que a curadoria revelou, e commitar.

## Verificadores permanentes (`scripts/`)

| script | o que garante | estado em 30/07/2026 |
|---|---|---|
| `audita-linhas.js` | toda citação "(linha n)" cai na linha certa | 35/35 |
| `audita-copias.js` | cópias do mesmo texto não divergem entre si | 134 grupos, 0 |
| `audita-sanidade.js` | integridade do item, campos obrigatórios, metadados | 21 checagens, 0 |
| `audita-acentos.js` | nenhum campo nosso sem acentuação | 0 |
| `audita-aspas.js` | nenhum campo mistura aspa reta com curva | 0 |
| `audita-paragrafos.js` | todo "segundo/terceiro parágrafo" existe no texto | 22/22 |
| `audita-imagens.js` | nenhuma descrição órfã, nenhuma imagem sem descrição | 0 e 0 |
| `progresso-curadoria.js` | quanto falta | — |

## Defeitos já catalogados (checklist de leitura)

Achados nos lotes 10–21; servem de roteiro para os próximos.

**Estrutura que a questão referencia e o texto não tem**
- citação de linha em texto sem numeração, ou com numeração deslocada pela
  re-quebra da importação;
- citação de parágrafo em texto que é um bloco único.

**Um texto, duas versões** — agrupar por `texto_base`: houve caso de três
questões apontando para uma versão degradada (sem manchete, sem imagem) enquanto
uma quarta tinha a boa.

**Coerência interna** — nome próprio, grafia e citação precisam bater entre
texto-base, enunciado, alternativas e comentário ("Petrobrás" vs "Petrobras";
"reflex reactions was" vs "reflex reaction was").

**Ruído de extração de PDF**
- linhas em branco espúrias entre as linhas numeradas;
- colunas intercaladas (título dentro do poema; box no meio da frase);
- **linhas fora de ordem** (frase embaralhada) — só se pega lendo;
- número de página solto no meio de uma frase ("13", "10");
- algarismo de coluna que finge ser numeração ("1 which offer rental…");
- palavra partida pela justificação ("jor-⏎nais") — junta **sem** o hífen, ao
  contrário do hífen legítimo ("energy-⏎harvesting"), que fica;
- letras espaçadas em título ("A L I F E - C H AN G I N G");
- apóstrofo invertido `‘` no lugar de `’`;
- espaço no fim das linhas.

**Aparato de prova onde não devia** — "As questões de 8 a 10 referem-se…",
"Leia o texto a seguir…", linha de fonte dentro do enunciado ou do alt.

**Marcação e tipografia** — `[[grifo]]` com colchetes duplicados; rótulo de item
(I., II.) isolado numa linha, separado do próprio texto; aspas retas simples no
comentário onde o padrão é aspas curvas duplas.

**Erros de língua** — corrigir quando evidentes e nenhuma questão depender deles
("the government an has been detained", "It would work incredibility quickly",
"MI I Cooper", "insistem a formação", "Therés", "éCORRETO").

## Decisões editoriais já tomadas

O professor delegou as decisões: *"não sei tomar essas decisões, quero que tudo
esteja perfeito pois será um produto vendável"*. Aplicar, registrar o porquê no
`PADRAO-EDITORIAL.md` e avisar quando a contagem pública mudar — não devolver a
pergunta.

- **Lacuna única** mantida (não converter para o formato de 5 lacunas).
- **493 e 734 publicadas**: item original de prova, completo, gabarito válido,
  comentário curado e referência interna que o texto atende, entra no ar.
- Descrição de tirinha pode viver no `texto_base` quando não há arquivo de
  imagem — o template só renderiza o alt junto com a imagem.

## O que o lote 27 mudou

O lote fechou com dry-run em zero: nenhum defeito pelos critérios que os quatro
verificadores já cobriam. Em vez de seguir para o lote seguinte, escrevi um
quinto verificador para o que **nenhum** deles olhava — a integridade do item em
si (gabarito, letras, campos obrigatórios, metadados, duplicatas). O acervo
inteiro passa nas 21 checagens.

Só um defeito real apareceu: a meta description da questão 4, com 175
caracteres, aparecia truncada no resultado de busca; foi reescrita em 146. Os
outros achados eram ruído do verificador novo, e o que se ajustou foi a regra,
não a questão — os três casos estão registrados no §11 do padrão.

A lição vale para os lotes 28 a 34: **um lote limpo não é um lote terminado.**
Quando o dry-run der zero, a pergunta seguinte é o que ainda não está sendo
verificado.



## Backup e restauração: a armadilha do WAL

**Nunca faça backup nem restauração do banco copiando `dados/banco.db`.**

O SQLite deste projeto roda em **modo WAL**. As escritas vão para
`banco.db-wal` (que chega a passar de 6 MB) e só depois são incorporadas ao
arquivo principal. Duas consequências, ambas já cobradas na prática:

- **Copiar só o `.db` produz um backup incompleto**, sem as escritas recentes.
- **Restaurar sobrescrevendo o `.db` não desfaz nada**: as alterações continuam
  no `-wal` e voltam a valer. Foi assim que um teste que injetava defeitos na
  questão 5 para conferir se o verificador acusava deixou os quatro defeitos no
  banco de produção — o "restore" por cópia de arquivo não desfez coisa alguma,
  e só o próprio verificador denunciou o estrago.

A forma correta de tirar uma cópia consistente, com o serviço no ar:

```bash
sqlite3 dados/banco.db ".backup '/caminho/copia.db'"
# ou, para uma cópia já compactada:
sqlite3 dados/banco.db "VACUUM INTO '/caminho/copia.db'"
```

Ambos respeitam o WAL e produzem um arquivo íntegro.

**Para testar um verificador, não use o banco de produção.** Copie com
`.backup` para `/tmp`, aponte o teste para a cópia, e nunca escreva em
`dados/banco.db` só para ver se o alarme dispara.

**Se algo for danificado mesmo assim**, prefira o conserto cirúrgico do que foi
mexido a restaurar o arquivo inteiro: entre o backup e o incidente pode haver
aluno respondendo simulado, e restaurar tudo apaga essas respostas. Depois do
conserto, rode `PRAGMA integrity_check` e `PRAGMA foreign_key_check`.


## Backup: o que existe e como usar

```bash
node scripts/backup.js             # cópia agora (roda com o site no ar)
node scripts/restaurar.js --conferir   # lista os backups e compara com o atual
node scripts/audita-backup.js      # prova que backup e restauro funcionam
```

Roda sozinho todo dia às 03:15 por cron, com saída em `/var/log/banco-backup.log`.
Destino: `/var/backups/banco-questoes/`.

- `diarios/` — as 14 últimas cópias de `banco.db` e `sessoes.db`
- `mensais/` — a primeira cópia de cada mês, por 6 meses
- `uploads/` — tarball das imagens, refeito **só quando o conteúdo muda**
  (36 MB não precisam ser copiados todo dia sem motivo)

Cada cópia passa por `integrity_check` e `foreign_key_check` **antes** de ser
aceita, e é recusada se falhar. Backup que ninguém testou é confiança falsa.

Duas armadilhas já cobradas na prática, ambas cobertas pelo `audita-backup.js`:

1. **A cópia se faz pela API online do SQLite (`db.backup`), nunca com `cp`.**
   O banco está em WAL: no teste, copiar o arquivo com o serviço no ar produziu
   uma cópia em que **nem a tabela existia** — o esquema inteiro estava no
   `-wal`.
2. **A conferência da cópia cria `-wal` e `-shm` ao lado dela.** Precisam ser
   removidos, senão a rotação os conta como backups e apaga cópias boas no
   lugar deles.

**Restaurar tudo é a última opção**, não a primeira: desfaz o que os alunos
fizeram desde aquele backup. Para estrago pontual, leia o valor certo do backup
e conserte só aquilo. Se for restaurar mesmo, o `restaurar.js` para o serviço,
guarda o estado atual, **apaga o `-wal` e o `-shm`** (sem isso o banco velho
volta a valer por cima do restaurado) e confere depois.

### Fora do servidor

```bash
node scripts/backup-remoto.js --dry   # cifra e confere, sem enviar
node scripts/backup-remoto.js         # cifra e envia
```

Roda às 03:25, dez minutos depois do backup local. Destino: o repositório
**privado** `Julioamancio/-EnglishforALL-backups`.

Não vai para o repositório do projeto: ele é público, e o banco tem nome,
e-mail e hash de senha de 94 alunos, muitos menores. E nem como repositório
privado com o banco commitado — o Git guarda toda versão para sempre, e 4,4 MB
por dia viram 1,5 GB em um ano. Cada envio **recria a história do zero**
(commit órfão + push forçado): o remoto guarda só a cópia mais recente e não
cresce. O histórico fica nas 14 diárias locais.

Tudo sai cifrado com AES-256 (pbkdf2, 200 mil iterações). A senha está em
`/root/.backup-senha`, modo 600; o script se recusa a rodar se ela estiver
legível por outros. **Sem essa senha o backup remoto é lixo** — guarde uma
cópia fora do servidor.

**Duas chaves SSH, de propósito.** Uma deploy key só vale para um repositório
em todo o GitHub, então o servidor tem `id_ed25519_github` (projeto) e
`id_ed25519_backups` (backups). O `~/.ssh/config` tem o apelido
`github-backups`, que aponta para o mesmo github.com com a segunda chave — daí
o remoto ser `git@github-backups:...`.

Provado de ponta a ponta clonando do GitHub numa pasta limpa, sem tocar em nada
local: os quatro arquivos chegam, decifram, o banco passa no `integrity_check`
e no `foreign_key_check`, as contagens batem, uma questão inteira se lê, e o
tarball das imagens abre com as 107 entradas. Senha errada falha alto, em vez
de devolver um arquivo corrompido em silêncio.


## Vídeos dos personagens

Os quatro personagens da apresentação de `/gramatica` são vídeos de 8 s em
laço. **Só ali** — numa página de tópico a mesma persona aparece 15 vezes, e
quinze vídeos tocando juntos travariam o celular do aluno.

```bash
python3 scripts/processa-persona.py ORIGEM.mp4 sofia
```

Origem: 1080×1920, 24 fps, 8 s, **fundo preto**. Saída: WebM/VP9 com alfa,
440 px de altura, ~300 KB cada.

### Fundo preto é melhor que branco, para estes personagens

Parece contra-intuitivo, e foi medido antes de decidir. Um recorte por
luminância come as partes do personagem que têm a cor do fundo:

| personagem | perderia com fundo BRANCO | perde com fundo PRETO |
|---|---|---|
| Max (robô branco) | 10% a 32% do corpo | ~2% |
| Leo (barriga e cauda creme) | 6% a 23% | ~2% |
| Maya (tênis e meias brancos) | 4% a 19% | ~3% |
| Sofia (camisa creme) | 3% a 23% | ~2% |

Os personagens são claros; o branco os apagaria. **Não vale a pena refazer os
vídeos com fundo branco.**

### O que o script faz, e por quê

1. **Preenche a partir dos quatro cantos**, não por limiar global. Só o preto
   **ligado à borda** vira transparente. Sem isso, o visor do Max, os cabelos
   da Sofia e da Maya e os olhos do Leo viravam buraco — são de 9 mil a 23 mil
   pixels escuros *dentro* do personagem.
2. **Tolerância 70.** Medido: de 34 para 70 o resíduo escuro cai de 513 para
   373 px e o corpo perde só 2%, que é a franja do brilho. Acima de 70 não
   melhora mais.
3. **Remove ilhas.** O brilho da antena do Max deixava manchas opacas soltas.
   Preenche-se o corpo a partir de dentro; o que sobrar opaco é resto e sai.
4. **Corta pela união das caixas de todos os quadros**, não quadro a quadro —
   senão o personagem treme dentro do enquadramento durante a animação.
5. **`-auto-alt-ref 0` no libvpx é obrigatório.** Com os quadros de referência
   alternativos ligados, o codificador descarta o canal alfa e o vídeo sai com
   fundo preto sólido.

### Na página

`src/lib/personas.js` lê no boot quais têm vídeo. Sem o arquivo, a persona cai
na PNG — o site nunca quebra por falta de vídeo. O `<video>` vai com
`autoplay muted loop playsinline` (o que o navegador exige para tocar sozinho)
e a PNG como `poster`: quem não tocar WebM com alfa vê a imagem, sem pulo de
layout. Quem pediu menos animação no aparelho também fica no quadro parado.

## O que ficou para depois

1. ~~Lote de tipografia.~~ **Feito em 31/07/2026.** A premissa estava errada: não
   há convenção única de aspas no acervo (em `comentario` e `imagem_alt` a reta é
   que é a regra), então não se uniformizou nada entre campos. O que era defeito
   de verdade — 28 questões misturando reta e curva **dentro do mesmo campo** —
   foi corrigido, e `scripts/audita-aspas.js` guarda isso. Ver §14 do padrão.
2. **Direito autoral de letra e poema** (§13 do padrão). 26 questões publicadas
   reproduzem letra ou poema integral e 4 recebem tratamento diferente, sem
   critério que as separe. Decisão jurídica e comercial, não editorial — está
   descrita com os três caminhos possíveis, à espera do professor.
3. **Questão 13** (tirinha The Joy of Tech, simulado 2021): completa e sem
   duplicata, despublicada. Imagem de terceiro, mesma natureza do item 2.
