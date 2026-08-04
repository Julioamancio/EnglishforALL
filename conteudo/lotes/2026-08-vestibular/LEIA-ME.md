# Lote de vestibular — agosto/2026

Material extraído de um .docx de 100 questões e preparado para importação.
O .docx original **não** está aqui: veio por upload numa sessão de chat e se
perdeu com ela. Tudo o que sobreviveu está neste diretório.

## Arquivos

- `lote.json` — as 78 questões de múltipla escolha extraídas e validadas
- `imagens/` — 78 tirinhas, nomeadas `instituicao-ano-NNN.png`

## De 100 para 73

| | |
|---|---|
| No documento | 100 |
| − dissertativas | 21 (decisão do professor: só múltipla escolha) |
| − questão 15 | 1 (matemática da Fuvest; as fórmulas se perderam na exportação) |
| − duplicatas confirmadas | 5 |
| **novas** | **73** |

Duplicatas, conferidas enunciado a enunciado contra o acervo vivo e marcadas
no campo `duplicata_de`:

| lote | id no acervo | prova |
|---|---|---|
| Q17 | 663 | ITA/2018 |
| Q18 | 664 | ITA/2018 |
| Q19 | 665 | ITA/2018 |
| Q50 | 23 | PUC-RS/2014 |
| Q70 | 113 | ENEM/2011 |

A Q50 é o mesmo item da id 23, mas o acervo tem o enunciado **traduzido para o
português** e o lote traz o original em inglês. Foi tratada como duplicata; se
a tradução for desvio, o conserto é na questão existente, não aqui.

## O que já está pronto em cada registro

Mecânico, extraído e verificado: `enunciado`, `alternativas`, `gabarito` (letra
conferida contra as alternativas), `texto_base`, `instituicao`, `ano`,
`imagem_arquivo` e `comentario` — este último só nas 52 que vieram comentadas.

## O que falta

Campos deixados **em branco de propósito**, porque são curadoria e não existem
no documento: `titulo`, `meta_description`, `tipo`, `genero_textual`, `tema`,
`nivel_cefr`, `imagem_alt`. Faltam também 21 comentários, nas questões em que o
documento trouxe só a letra do gabarito.

Preencher exige **ver cada tirinha** — nem o `alt` nem o comentário saem do
texto.

## Quatro bugs de atribuição já corrigidos

Todos do mesmo tipo: conteúdo vazando de uma questão para a vizinha. Nenhum
aparece lendo a questão isolada.

1. Tirinha de bloco compartilhado colada na questão **anterior**
2. Imagem depois das alternativas descartada — a seguinte herdava a errada
   (a Q2 ficou com o Garfield da Q1 no lugar do Snoopy dela)
3. Uma única imagem espalhada por cinco questões de instituições diferentes
4. **Texto-base vazado em 41 das 43** — inclusive atribuindo uma tirinha do
   Charles Schulz ao Jim Davis

## As duas verificações que os pegam

Rodar sempre depois de mexer no `lote.json`. As duas têm de dar zero:

- nenhuma imagem usada por questões de **fontes diferentes**
- nenhum texto-base cobrindo **imagens diferentes**

Foi cruzando campos que deveriam bater entre si que os quatro apareceram.
Ler a questão sozinha não revela nenhum deles.

## Como importar

`scripts/importar-lote.js`, que recusa questão incompleta em vez de gravar
pela metade:

```bash
cd /var/www/banco-questoes
NODE_PATH=/var/www/banco-questoes/node_modules /usr/local/bin/node20 \
  scripts/importar-lote.js conteudo/lotes/2026-08-vestibular/lote.json
```

Sem `--gravar` ele só simula. As imagens precisam estar em
`public/uploads/` antes — imagem apontando para arquivo inexistente rende
ícone quebrado, que o padrão registra como pior do que não ter imagem.
