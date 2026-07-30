# Estado da curadoria — retomada

Documento de retomada: tudo o que é preciso para continuar a curadoria sem
depender do histórico da conversa. O que **deve** ser feito está no
`PADRAO-EDITORIAL.md`; aqui está **onde paramos e como se roda um lote**.

Atualizado em 30/07/2026, ao fim do lote 21.

## Onde paramos

- **Lotes 1 a 21 concluídos e gravados: IDs 1 a 758.**
- Próximo lote começa no **ID 759**.
- Faltam **307 questões (IDs 759–1066), 13 lotes**.
- **1.050 questões publicadas** (eram 1.048; entraram a 493 e a 734).
- O **ITA está inteiramente curado**. O que resta é Fuvest (242, IDs 825–1066),
  PUC Minas Medicina (40, IDs 764–824) e PUC Minas (25, IDs 759–819) — textos
  curtos e muitos itens discretos, sem o aparato de linha/parágrafo que gerou o
  grosso do trabalho no ITA.

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
6. **Auditorias** — rodar os três verificadores; todos devem ficar em zero.
7. **Verificar no site** via curl: páginas 200, o defeito corrigido aparecendo
   certo, sitemap válido, portas 8091/8096.
8. **Registrar** no `PADRAO-EDITORIAL.md` o que a curadoria revelou, e commitar.

## Verificadores permanentes (`scripts/`)

| script | o que garante | estado em 30/07/2026 |
|---|---|---|
| `audita-linhas.js` | toda citação "(linha n)" cai na linha certa | 30/30 |
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
