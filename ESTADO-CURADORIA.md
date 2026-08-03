# Estado da curadoria — retomada

Documento de retomada: tudo o que é preciso para continuar a curadoria sem
depender do histórico da conversa. O que **deve** ser feito está no
`PADRAO-EDITORIAL.md`; aqui está **onde paramos e como se roda um lote**.

Atualizado em 31/07/2026, ao fim do lote 33 — **os lotes por id terminaram**.

## Onde paramos

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
   certo, sitemap válido, portas 8091/8096.
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
