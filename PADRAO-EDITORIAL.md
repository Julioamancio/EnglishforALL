# Padrão editorial do banco

Documento descritivo, não aspiracional: registra o padrão que o acervo **de fato
segue**, apurado na curadoria questão a questão. Serve para item novo entrar
alinhado e para decisão já tomada não voltar à mesa.

Última revisão: 30/07/2026 — durante a curadoria dos lotes 1 a 18 (IDs 1–680
lidos; 1.049 publicadas).

---

## 1. Alternativas

- **Cinco alternativas, A–E**, é o padrão.
- **Quatro alternativas, A–D**, quando a prova original tinha quatro. Ocorre em
  **65 questões**: PUC Minas, PUC Minas (Medicina), Unicamp, EPCAR e UFU.
  Isso é fidelidade à prova, não defeito. Nunca completar para cinco.
- A letra do gabarito precisa existir entre as alternativas (verificado: 0 órfãos).
- Nenhuma alternativa vazia (verificado: 0).
- **Não repetir a letra dentro do texto da alternativa.** O texto guarda só o
  conteúdo; a letra é impressa pelo template e pelos exportadores.

### Tamanho
Evitar que a maior alternativa passe do dobro da menor **quando as alternativas
são frases**. Não se aplica a itens cujas alternativas são uma ou duas palavras
(traduções de conjunção, formas verbais, rótulos gramaticais), onde a diferença
absoluta é de poucos caracteres e não cria pista.

Exceção conhecida: ITA e Fuvest escrevem alternativas longas e desiguais nas
provas originais. São **42 questões** nessa condição e ficam como estão, por
fidelidade.

## 2. Itens de lacuna

O banco tem **dois formatos**, ambos deliberados:

1. **Lacuna única** — 97 itens, toda a coleção Use of English. Um item isola um
   ponto gramatical. Comando no singular: *"Assinale a alternativa que completa
   corretamente a lacuna do texto."* Quando a categoria ajuda o aluno, o comando
   a nomeia: *"…a alternativa com a preposição que completa…"*.
2. **Quatro lacunas** — 5 itens do ITA (541, 666, 667, 668, 669), reproduzindo o
   número de lacunas da prova original.

**Decisão de 29/07/2026:** o formato de cinco lacunas numeradas com o número
antes — `(1) __________` — **não é usado neste banco** e não será retroativamente
aplicado. Converter os 97 itens de lacuna única destruiria o princípio de um
ponto gramatical por item, que é o que sustenta o comentário explicativo.
Se um dia entrar um item de múltiplas lacunas autoral, aí sim vale o formato
numerado com o número antes da lacuna.

## 3. Enunciado

- Não entrega a resposta nem nomeia a operação de leitura esperada.
- **Comando único.** Nada de duas perguntas ligadas por "e como…".
- O preâmbulo contextualiza o que o item realmente avalia. Se o item não testa
  oralidade, o preâmbulo não fala de oralidade.
- Termos do gênero corretos: tirinha é tirinha, não "desenho animado".

## 4. Distratores

- Plausíveis para quem leu mal; cada um falha por um motivo **textual nomeável**.
- Sem opção-coringa: nada de "nenhuma das alternativas acima".
- Sem opção morta — alternativa que não responde ao comando (nota etimológica,
  curiosidade) não é distrator, é enchimento.
- Não construir o item com quatro negativas e uma afirmativa: a resposta passa a
  ser identificável pela forma, sem leitura.

## 5. Comentário do gabarito

- Abre pela explicação, **não** repetindo "O gabarito é a letra X" — a página já
  mostra a resposta logo acima.
- Cita o trecho do texto que decide a questão, em inglês, entre aspas.
- Nomeia o distrator mais forte e diz qual trecho o derruba.
- Não afirma detalhe que não está no texto-base.
- É escrito em português. Palavra inglesa só como **menção** (o conectivo em
  análise), nunca como peça da sintaxe portuguesa.
- Citação do texto entre **aspas curvas duplas** (“…”); aspas retas simples
  ('…') são resíduo de importação. Apóstrofo dentro da palavra inglesa fica.
- Nota editorial ("questão oficial do ENEM X", "gabarito do documento") não vai
  no comentário do aluno.

## 6. Texto-base

- Guarda **o texto**, nunca o comando de leitura. "Leia a tira a seguir" pertence
  ao enunciado; a procedência vai em `fonte_veiculo` / `fonte_url` / `fonte_data`.
- **A quebra de linha é significativa** e é preservada na tela (`white-space:
  pre-line`), no PDF e no DOCX. Vale para verso de poema, letra de canção,
  manchete, assinatura, item de lista e transcrição de quadrinho.
- Convenção: parágrafo em prosa = uma linha; blocos separados por linha em
  branco; verso e turno de diálogo = uma linha cada.
- Gêneros cuja forma faz parte do que se ensina — e-mail, carta, diálogo,
  entrevista, aviso, anúncio — têm estrutura de linha de verdade: saudação,
  corpo, despedida e assinatura em blocos; um turno por linha; manchete separada
  do corpo.
- Sem etiqueta de prova no corpo do texto ("(Uea 2023)") — a instituição tem
  campo próprio.
- **Numeração de linha da prova** (ITA marca de 5 em 5) é conteúdo, não ruído,
  quando alguma questão do bloco cita "linha n": ali a quebra de linha física é
  a própria referência e não pode ser juntada. Marcador em campo de dois
  caracteres alinhado à direita, corpo do texto recuado em três espaços. Ao
  mexer nesses textos, conferir linha a linha contra o que as questões citam.
  Casos vivos: 519–523 (ITA 2011), 556–563 (ITA 2013), 572–578 (ITA 2014).
- **Três convenções de numeração convivem no acervo**: a maioria dos textos
  numera de 5 em 5 só as linhas com conteúdo; "A HISTORY OF PI" (572–578) numera
  também a linha em branco entre seções (daí o marcador 5 aparecer sozinho); e os
  textos do ITA 2016 (611–617, 621–624, 625–630) numeram **linha a linha**,
  incluindo o título como linha 1 e uma linha 2 em branco que sobrevive como um
  "2" solto — ali o "2" é conteúdo e não pode ser removido como ruído. Descobrir
  qual convenção o texto usa antes de mexer.
- Nem todo número no começo da linha é numeração: o PDF deixa marcas de coluna
  ou de página que viram um algarismo solto no meio do texto. Em "DISTANT PEAK
  CAR" (584–591) havia dois "1" assim, nas linhas 16 e 31. Sinal de que é ruído:
  o valor não cabe na sequência de 5 em 5 e a linha começa em minúscula
  ("1 which offer rental…").
- **A citação de linha é um contrato com o aluno e precisa ser verificada.**
  `audita-linhas.js` percorre o acervo, extrai o trecho citado antes de cada
  "(linha n)" e confere se ele cai naquela linha. Em 30/07/2026 acusou o bloco
  ITA 2013 com deslocamento de +2 (a importação re-quebrou as linhas e pôs os
  marcadores nas posições novas) e o bloco ITA 2014 com +1; ambos corrigidos
  re-quebrando o texto pelas próprias citações. Estado atual: **30 de 30
  citações conferidas**. Rodar essa auditoria depois de qualquer mexida em
  texto numerado.
- **Texto sem numeração cuja questão cita "linha n"** é o caso mais silencioso:
  a auditoria não o via, porque só examinava textos que já tinham marcadores. Em
  "The age of obesity" (671–675, ITA 2019) a quebra de linha já era a da prova —
  a linha 19 batia com o trecho citado —, faltavam só os marcadores; inseridos em
  30/07/2026. Ao encontrar caso assim, conferir a quebra contra a citação antes
  de numerar; se não bater, o texto foi re-quebrado e precisa de reconstrução.
- A referência também quebra: "(linhas⏎19-20)". As regras de junção só colavam
  continuação que começa por letra, então o número escapava.
- Quebra de linha do PDF que corta a frase no meio é ruído e deve ser juntada;
  quando a linha termina em hífen, junta-se sem espaço ("so-called").
- **Um texto, uma versão.** Quando várias questões citam a mesma peça, todas
  guardam o mesmo `texto_base` e a mesma imagem — inclusive as que não fazem
  pergunta sobre a parte gráfica. Corrigido em 30/07/2026 no anúncio da GE
  Capital (ITA 2012): 541 tinha manchete, imagem e alt, enquanto 540, 542 e 543
  traziam uma versão sem manchete, sem imagem e com as lacunas mal formatadas.
- Filete e ornamento de diagramação ("____________") não são texto: saem.
- **Erro tipográfico evidente no texto importado é corrigido** quando nenhuma
  questão do bloco depende dele: o banco ensina inglês e não pode reproduzir
  forma agramatical. Aplicado a "the government an has been detained" → "and",
  "It would work incredibility quickly" → "incredibly" e ao verso de Blake
  "the palm of you hand" → "your hand". Grafia legítima ainda que incomum fica
  como está (ex.: "an idea that remains illusive", que é palavra real).

### Descrição de imagem (`imagem_alt`)

- Começa pelo conteúdo da peça (título, primeira fala), nunca por aparato da
  prova ("As perguntas de 4 a 8 correspondem ao texto a seguir:") nem por número
  de página ou de seção solto — isso é ruído para leitor de tela.
- A descrição visual entre colchetes fecha o campo e é onde se registra
  diagramação, ilustração e assinatura.
- **O alt só aparece na tela se houver imagem** (`views/publico/questao.ejs:17`
  renderiza o par). Quando a peça não tem arquivo de imagem, a transcrição vai no
  `texto_base` mesmo — é o caso da tirinha do CommitStrip (676–678), que parece
  fora do padrão e não é. Verificado em 30/07/2026: **nenhum alt órfão e nenhuma
  imagem sem alt** no acervo; `scripts/audita-imagens.js` refaz essa checagem.

## 7. Itens discretos antigos

Fuvest 1977–1979 e similares: tradução de frase única, escolha de forma verbal.
**Não precisam de texto-base nem de fonte separada** — a prova é a fonte, e a
frase vive no próprio enunciado. São 22 questões. Não marcar como problema.

## 8. Duplicatas

Um item só entra uma vez. Quando a mesma questão existe em duas versões, fica a
que tem **procedência real da prova**; a cópia rotulada "Simulado" sai do ar com
`publicada = 0` e ganha um 301 em `src/lib/redirecionamentos.js`, para a URL
antiga não virar 404.

Aplicado em 29/07/2026 a 8 questões: 13, 34, 55 (cópias de ITA 2015, Fuvest 2021
e Unesp 2025) e 769–773 (caderno 2 da PUC Minas Medicina 2019, que repete as
cinco questões do caderno 1 com as alternativas embaralhadas).

### Grifo no enunciado

O trecho grifado vai entre colchetes duplos — `[[which]]` —, que o template
converte em `<u>`. Colchete a mais (`[[[[which]]]]`) quebra o grifo e vaza o
sinal para a tela; corrigido na questão 655 em 30/07/2026.

### Tipografia importada

- **Apóstrofo**: a curva correta é `’` (U+2019). O OCR do ITA 2017 trocou por
  `‘` (U+2018, aspa de abertura) dentro das palavras — "didn‘t", "Seattle‘s",
  "Corp.‘s" —, 17 ocorrências corrigidas em 30/07/2026. Em citação simples
  aninhada, abre com `‘` e fecha com `’`; no texto da Geri Taylor as duas
  estavam trocadas entre si.
- **Letras espaçadas**: título em caixa-alta com espaço entre as letras
  ("A L I F E - C H AN G I N G") é falha de extração de PDF, não estilo. Único
  caso do acervo, na 631.

### Coerência interna do item

O nome próprio, a grafia e a citação do texto precisam ser os mesmos no
texto-base, no enunciado, nas alternativas e no comentário. Defeitos assim só
aparecem comparando as peças entre si, nunca lendo cada uma isolada. Corrigidos
em 30/07/2026: "Petrobrás" na alternativa D da 616 enquanto a B da mesma questão
e o texto-base grafam "Petrobras"; e a alternativa E da 613 citando "reflex
reactions was" onde o texto-base e a questão 617 trazem "reflex reaction was".

### Republicação

**Decisão de 30/07/2026:** a questão **493** (ITA 2009, entrevista Milton
Hatoum, "reformulação de perguntas") veio da importação com `publicada = 0`
porque o texto-base tinha perdido a numeração das dez perguntas — e as
alternativas citam "a pergunta n° 1/4/5/8". Com a numeração restaurada no
lote 11, não havia mais motivo para segurá-la: publicada em 30/07/2026.
Contagem pública: **1.048 → 1.049**.

## 9. Metadados

- `instituicao` e `ano` refletem a prova de origem, não o simulado que a reusou.
- O ano no slug e o campo `ano` não podem divergir.
- CEFR: o mesmo item não pode aparecer com dois níveis diferentes.

## 10. SEO

- Sitemap só com URL canônica. Listagem filtrada não entra.
- Exceção: `?nivel=` nas coleções (`/reading`, `/use-of-english`) — são páginas
  de destino com título, meta description e conteúdo próprios, entram no sitemap
  e se autocanonizam. Só entram os níveis que têm questão publicada.
- Qualquer outra query string: `noindex,follow` com canonical na página sem filtro.
