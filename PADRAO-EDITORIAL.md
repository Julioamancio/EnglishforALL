# Padrão editorial do banco

Documento descritivo, não aspiracional: registra o padrão que o acervo **de fato
segue**, apurado na curadoria questão a questão. Serve para item novo entrar
alinhado e para decisão já tomada não voltar à mesa.

Última revisão: 30/07/2026 — durante a curadoria dos lotes 1 a 26 (IDs 1–890
lidos; **1.051 publicadas**). Faltam 176 questões (IDs 891–1066), 8 lotes, todas
da Fuvest. **ITA e PUC Minas inteiramente curados.**

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
- **Referência de linha impossível de atender.** Quando o texto não tem numeração
  **e** a quebra do banco não corresponde à da prova, não há como restaurar: o
  texto 857 tem 7 linhas e a questão cita "linhas 16-17". Numerar seria inventar
  uma quebra; trocar o número seria reescrever a prova.
  **Decisão de 30/07/2026:** remove-se apenas a referência numérica e mantém-se a
  citação do trecho, que é o que de fato o aluno usa para localizar — "…university
  today.” (linhas 16-17)" vira "…university today.”". Aplicado a 21 questões
  (ITA 2008 e Fuvest 1998–2007). O script só remove quando a palavra imediatamente
  antes da referência existe no texto-base; caso contrário, aborta.
  Também citam em inglês, "(line n)" — o verificador cobre as duas formas.
- **Texto sem numeração cuja questão cita "linha n"** é o caso mais silencioso:
  a auditoria não o via, porque só examinava textos que já tinham marcadores. Em
  "The age of obesity" (671–675, ITA 2019) a quebra de linha já era a da prova —
  a linha 19 batia com o trecho citado —, faltavam só os marcadores; inseridos em
  30/07/2026. Ao encontrar caso assim, conferir a quebra contra a citação antes
  de numerar; se não bater, o texto foi re-quebrado e precisa de reconstrução.
- A referência também quebra: "(linhas⏎19-20)". As regras de junção só colavam
  continuação que começa por letra, então o número escapava.

### Referência a parágrafo

A questão que manda olhar o "segundo parágrafo" exige que o texto **tenha
parágrafos demarcados** — no banco, blocos separados por linha em branco, que é
como o template os renderiza. Os textos do ITA 2020 em diante vieram da
importação como um bloco único de linhas quebradas por largura de coluna, e 17
citações de parágrafo ficaram sem como ser atendidas. `scripts/audita-paragrafos.js`
mede isso; em 30/07/2026 os dez textos do bloco ITA 2020–2022 foram remontados
(cada parágrafo numa linha corrida, separados por linha em branco), conferindo
que o parágrafo citado contém mesmo o trecho citado. Os últimos casos (ITA
2022–2024) saíram no lote 20: **as 22 citações de parágrafo do acervo resolvem**.

Quando a peça não tem `texto_base` e o texto vive no `imagem_alt`, a contagem de
parágrafos é a do alt — é o caso da 501.

**A PUC Minas cita em inglês, "(paragraph n)"**, e ali duas coisas deslocavam a
contagem, ambas corrigidas em 30/07/2026:

1. o **comando da prova dentro do texto-base** ("READ THE FOLLOWING TEXT AND
   CHOOSE THE OPTION…") ocupava o lugar do primeiro parágrafo — 12 textos, 65
   questões;
2. **parágrafo partido em dois blocos**: a importação abriu linha em branco no
   meio de uma frase e o bloco seguinte começa em minúscula, criando um parágrafo
   a mais. Sinal seguro: o bloco anterior não termina em pontuação final.
   Encontrado em 4 textos (131, 148, 163 e 759).

Estado: **as 12 citações em inglês conferidas**, zero divergências (os dois
últimos casos, 792 e 793, saíram no lote 23 ao demarcar os parágrafos do texto).

### Citação que não bate com o texto

Vale para qualquer língua: o trecho entre aspas no enunciado tem de existir no
texto-base, palavra por palavra. Corrigidos em 30/07/2026 "physically snap them"
(o texto traz "physically **to** snap them") e "as **a** facial recognition" (o
texto traz "as facial recognition"). A citação segue o texto, nunca o contrário.

### Linha fora de ordem

A extração em duas colunas às vezes **troca linhas de lugar**, e o resultado é uma
frase embaralhada que só aparece na leitura. No texto 705 o fecho estava "glimpse
alternative / experience.” / ways of making sense of the human"; a ordem correta é
"glimpse alternative ways of making sense of the human experience.”. Não há como
detectar isso por script — só lendo.
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
- **A descrição é texto nosso, e leva acento.** No lote 30 (30/07/2026)
  apareceram quatro blocos digitados sem acento nenhum: "O texto e acompanhado de
  tres graficos", "um robo industrial com dois bracos articulados sobre uma base
  movel, com a inscricao", "cena de animacao com dois passaros" e "golpeia um
  cerebro gigante". Eram 11 questões (984-986, 987-988, 989-991, 999-1001), e o
  português errado ia para a página. Os demais blocos do mesmo lote (966, 967,
  974, 979) estavam certos, o que mostra descuido e não convenção. A verificação
  usada: retirados os diacríticos, o texto novo tem de ser idêntico ao antigo —
  só a acentuação podia mudar.

### Ressalva de gabarito não oficial

Algumas provas antigas da Fuvest não tiveram gabarito publicado, e o comentário
dessas questões termina avisando: *"A Fuvest não publicou o gabarito desta prova;
esta resposta é a leitura do nosso time, não a oficial."* Isso **não** é nota
editorial proibida pelo §5 — é ressalva de confiabilidade, e o aluno precisa
dela.

Aparece em 68 questões e é **consistente por prova**: 1977 (9/9), 1998 (14/14),
2001, 2002 (14/14), 2003, 2004 (8/8) têm; 1978 (0/10), 1979 (0/12), 1999 e 2000
(0/14) não têm. Esse desenho por prova indica critério de quem curou, não
esquecimento. Não mexer sem uma fonte que diga quais provas tiveram gabarito
divulgado.

### Pendência de tipografia

**197 textos-base ainda usam aspas retas duplas** (`"`) onde o padrão do acervo
é aspa curva (`“ ”`). É defeito amplo e uniforme, que merece um lote próprio de
tipografia em vez de correção avulsa. Medido em 30/07/2026, não corrigido.

### Reticências e marcadores

**Lote 28, 30/07/2026.** Reticência importada vira sequência de pontos, e a
contagem varia: a **926** citava `"....in the long run"` com quatro pontos e a
**928** citava `"...whole hours can go missing"` com três. Três pontos ou mais
viram reticência tipográfica (`…`).

Quando a reticência marca a **lacuna** de um item, ela precisa de espaço dos dois
lados. A **934** trazia `unless she...by five`, em que a lacuna se cola às
palavras vizinhas e some na leitura; virou `unless she … by five`.

O marcador `•` da linha de fonte também chega colado: o texto da New Scientist
compartilhado pelas questões 922 a 926 trazia `21 July 2001• New Scientist`.

### Numeração de linha: quatro convenções

**Lote 30, 30/07/2026.** A numeração das provas aparece de quatro jeitos, e
todos convivem no acervo:

1. marcadores no início da linha começando em **1** (ITA);
2. marcadores no início da linha **de 5 em 5, sem nunca imprimir o 1** — o mais
   comum na Fuvest: só aparecem 5, 10, 15, 20;
3. marcadores **no fim** da linha (Fuvest 2008, Fuvest 2021);
4. numeração que conta as linhas em branco e numeração que não conta.

Por isso o `audita-linhas.js` não procura mais o marcador "1": ele **deduz** a
origem. Se o marcador M está no índice i, a linha 1 está no índice i-M+1, e dois
marcadores de valores diferentes precisam concordar com a mesma origem — é a
concordância, não o valor, que separa marcador de número solto no meio do texto.
O verificador também passou a aceitar a citação abreviada (`(l. 3)`, `(L. 14-15)`)
e a descartar o marcador de dentro da linha antes de comparar, porque ao juntar
duas linhas ele caía no meio do trecho citado (a 1023 cita "this kind of
barrier", que atravessa as linhas 14 e 15 com o marcador "15" no meio).

O ganho foi imediato: de **30 para 35 citações efetivamente conferidas**. As que
faltavam (542, 966, 976, 1019, 1023 e 1034) estavam corretas, mas o verificador
as classificava como "texto sem numeração" e simplesmente pulava. Hoje: 35
conferidas, zero divergências, zero textos sem numeração.

### Aparato de prova no texto-base

**Lote 32, 30/07/2026.** O texto-base não carrega o cabeçalho que numerava as
questões na prova. Os textos de 1033-1035 e 1036-1037 começavam com "TEXTO PARA
AS QUESTÕES DE 56 A 58" e "TEXTO PARA AS QUESTÕES 59 E 60": no site cada questão
aparece sozinha, e esse cabeçalho manda o leitor procurar uma numeração que não
existe na página. Removidos.

Remover a primeira linha **não quebra a numeração de linha**, porque o
`audita-linhas.js` deduz a origem a partir dos marcadores e não de uma posição
fixa (ver "Numeração de linha: quatro convenções"). Conferido: a citação
"(L. 15)" da 1034 continua caindo na linha certa depois do corte.

Ficam os cabeçalhos que ainda fazem sentido isolados: "TEXTO I" (142), quando o
enunciado se refere a ele, e "Leia os provérbios:" (1039), que apresenta o quadro
logo abaixo.

**Lote 33:** removida também a linha "Considere o texto a seguir:" da **1065**,
pelo mesmo motivo — o texto vem logo em seguida, na própria página, e o comando
só repete o óbvio. Continua valendo a distinção: "Leia os provérbios:" (1039)
fica, porque apresenta o quadro numerado de que o enunciado depende.

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

### Grifo no enunciado e no texto

O trecho grifado vai entre colchetes duplos — `[[which]]` —, que o template
converte em `<u>`. Vale no enunciado, na alternativa e **também no texto-base**.
Colchete a mais (`[[[[which]]]]`) quebra o grifo e vaza o sinal para a tela;
corrigido na questão 655 em 30/07/2026.

**Por isso o mesmo texto aparece em várias cópias**: quando cinco questões
analisam trechos diferentes de um texto, cada uma guarda a sua cópia com o seu
realce. É deliberado, não duplicação acidental — mas exige cuidado, porque uma
correção precisa alcançar todas as cópias. `scripts/audita-copias.js` compara as
cópias ignorando o realce e acusa qualquer divergência. Estado em 30/07/2026:
**134 textos com cópias, nenhuma divergente**, 31 questões usando realce, nenhum
realce quebrado.

### Tipografia importada

- **Apóstrofo**: a curva correta é `’` (U+2019). O OCR do ITA 2017 trocou por
  `‘` (U+2018, aspa de abertura) dentro das palavras — "didn‘t", "Seattle‘s",
  "Corp.‘s" —, 17 ocorrências corrigidas em 30/07/2026. Em citação simples
  aninhada, abre com `‘` e fecha com `’`; no texto da Geri Taylor as duas
  estavam trocadas entre si.
- **Letras espaçadas**: título em caixa-alta com espaço entre as letras
  ("A L I F E - C H AN G I N G") é falha de extração de PDF, não estilo. Único
  caso do acervo, na 631.
- **Palavra partida pela justificação**: "jor-⏎nais", "iden-⏎tificar",
  "specifi-cally". Junta-se **sem o hífen**. Cuidado para não confundir com o
  hífen legítimo cortado pela mesma quebra ("energy-⏎harvesting",
  "post-⏎doctoral", "well-⏎being") nem com URL quebrada, casos em que o hífen
  fica. Não há regra automática segura: os cinco casos do acervo foram tratados
  um a um em 30/07/2026.

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

Mesma decisão para a **831** (Fuvest 1977, pronome relativo), item discreto
idêntico em estrutura às quatro irmãs publicadas da mesma prova. Publicada no
lote 24: **1.050 → 1.051**.

Mesma decisão para a **734** (ITA 2024, protestos contra o sexismo na Coreia),
também completa e curada, cujo enunciado cita "os parágrafos seis e sete" — o
texto tem nove. Publicada no lote 21: **1.049 → 1.050**. O critério é este: item
original de prova, completo, com gabarito válido e comentário curado, e cuja
referência interna o texto atenda, entra no ar.

### Por que uma questão fica fora do ar

**Lote 32, 30/07/2026.** As 12 questões com `publicada = 0` foram conferidas uma
a uma. A **1039** (Fuvest 2021, três provérbios) não tinha motivo para estar
retida — item completo, gabarito válido, comentário curado, sem pendência de
referência — e foi publicada: **1.051 → 1.052**. As outras continuam fora, e os
motivos formam três famílias:

- **Letra de música**: 34 (Maggie's Farm), 105 (Viva la Vida), 112 (War).
  **Ressalva do lote 33:** escrevi aqui que essas três estavam fora "por direito
  autoral" e que era por isso que a 1038 podia estar no ar com a letra
  substituída por uma nota. Os números não sustentam essa leitura — ver
  "Reprodução de letra e poema" na seção 12. Era racionalização minha, não uma
  política do acervo.
- **Duplicata de outra já publicada**: 55 é a mesma tirinha, o mesmo enunciado e
  o mesmo gabarito da 87; 769-773 são o caderno 2 da PUC Minas 2019, cópia das
  764-768 do caderno 1.
- ~~**Texto incompleto**: 1060.~~ **Errado, corrigido no lote 33.** A 1060 não
  está truncada: é um **verbete**, e "justice" é a palavra-título — como a própria
  nota do texto avisa ("a palavra-título 'justice' aparece em negrito no início do
  texto"). O que me enganou foi a minúscula depois da aspa. O verbete traz as três
  acepções, fecha em Aristóteles e tem a referência completa. **Publicada no lote
  33: 1.052 → 1.053.**

Fora dessas três, sobra a **13** (tirinha The Joy of Tech num simulado próprio):
completa e sem duplicata, mas é imagem de terceiro. Publicar imagem de terceiro
num produto à venda é decisão de licenciamento, não editorial — fica para o
professor decidir, e é a única pendência desse tipo no acervo.

## 9. Metadados

- `instituicao` e `ano` refletem a prova de origem, não o simulado que a reusou.
- O ano no slug e o campo `ano` não podem divergir.
- CEFR: o mesmo item não pode aparecer com dois níveis diferentes.



### Título

O título cita a prova **entre parênteses**, no fim: `Nap breaks no trabalho
(Fuvest 1999)`.

**Lote 29, 30/07/2026.** A leitura do lote encontrou a Fuvest 2006 partida ao
meio — as questões 951 a 954 usavam parênteses e as 955 a 958 usavam travessão
(`… — Fuvest 2006`). O levantamento mostrou 467 títulos com parênteses contra 57
com travessão, e os 57 eram blocos contíguos de id (881-898, 955-973,
1027-1065), resquício de uma fase anterior do trabalho. Em quatro provas os dois
estilos apareciam lado a lado: Fuvest 1999, 2006, 2020 e 2025. Os 58 títulos com
travessão (57 publicados e um despublicado) passaram para parênteses. Só o campo
`titulo` mudou; slug e URL ficaram intactos.

Não são defeito, e ficam como estão:

- **Meta description sem fórmula fixa.** Convivem três aberturas ("Questão de
  inglês…", "Fuvest 2006: …" e entrada direta no assunto). Meta boa é específica
  e convida ao clique; padronizar a abertura só a tornaria repetitiva na SERP.
- **Disclaimer de gabarito por prova inteira.** As 68 questões que avisam que a
  Fuvest não publicou o gabarito estão em Fuvest 1977, 1998, 2001, 2002, 2003 e
  2004, e **nenhuma prova tem o aviso pela metade** — ou toda a prova traz, ou
  nenhuma questão traz. É o comportamento correto: o aviso é uma propriedade da
  prova, não do item.

## 10. SEO

- Sitemap só com URL canônica. Listagem filtrada não entra.
- Exceção: `?nivel=` nas coleções (`/reading`, `/use-of-english`) — são páginas
  de destino com título, meta description e conteúdo próprios, entram no sitemap
  e se autocanonizam. Só entram os níveis que têm questão publicada.
- Qualquer outra query string: `noindex,follow` com canonical na página sem filtro.

## 11. Sanidade estrutural

Verificado por `scripts/audita-sanidade.js`, criado em 30/07/2026 quando o lote
27 fechou com zero alterações e ficou claro que valia mais olhar o que os
verificadores **não** cobriam do que rever o que já estava limpo. Ele checa o
item em si — gabarito com alternativa correspondente, quantidade e sequência das
letras, alternativas repetidas, campos obrigatórios, slug único, tamanho de
comentário e meta description, CEFR na escala, ano coerente e questão duplicada.

Três achados iniciais eram ruído do próprio verificador, e a regra foi calibrada
em vez de a questão ser mexida:

- **Alternativa que "começa com a própria letra"**: a alternativa A da **59** é
  "A.I. writes the email…". A letra ali é sigla, não rótulo repetido. O teste
  passou a exigir espaço depois da letra.
- **Ano do slug divergente** em 23, 24, 25, 26 e 54: o ano no fim desses slugs é
  o do simulado que reusou a questão ("…-uea-2023-simulado-2025"), e o campo
  `ano` guarda o da prova de origem, como manda o §9. Slug com "simulado" saiu
  da comparação. Não se mexe em slug publicado sem necessidade — custaria um 301.
- **Comentário curto** em 177, 178, 182, 184 e 191 (174 a 199 caracteres): são
  itens A1/A2 de texto curto, e os cinco explicam resposta e distratores. O piso
  caiu de 200 para 150 caracteres, que é onde um comentário fica de fato incompleto.

Também não são defeito o enunciado repetido entre questões ("Assinale a
alternativa que completa corretamente a lacuna do texto." é comando de prova,
repetido em 144 itens) nem duas perguntas diferentes sobre o mesmo texto, que é
como uma prova é montada. Duplicata só é acusada quando comando, texto e
alternativas coincidem — hoje, nenhuma.

Corrigido de verdade: a **meta description da 4**, com 175 caracteres, aparecia
truncada no resultado de busca. Reescrita em 146.

## 12. Acentuação dos campos que são nossos

**Lote 31, 30/07/2026.** `tema`, `meta_description`, `titulo`, `comentario` e as
descrições entre colchetes são redação nossa, e seguem o português correto —
acentuação inclusive. Verificado por `scripts/audita-acentos.js`.

O defeito veio à tona pela porta dos fundos. No lote 30 corrigi quatro descrições
de imagem sem acento; no lote 31 a **994** apareceu com o mesmo problema ("um
copo descartavel", "uma composicao que remete ao quadro") e tinha escapado,
porque o detector daquele lote procurava uma **lista de palavras** — e lista
sempre deixa passar a próxima palavra. Trocado por busca de **sufixo**
(`-cao`, `-coes`, `-avel`, `-ivel`, `-encia`, `-ancia`, que em português sempre
levam acento e não são terminações inglesas), o levantamento mostrou que o
problema não estava nas descrições: estava em **163 campos `tema` e
`meta_description`** — "audiencia na publicidade online", "exercicio fisico e
cognicao", "participacao cidada na justica japonesa". Esses campos vão para a
página e para o resultado de busca.

Três armadilhas, todas descobertas por falso positivo, e todas registradas no
verificador:

- **`\w` não serve.** Ele exclui os acentuados, então em "Referenciação" a
  varredura para antes do "ç" e inventa um "Referencia" sem acento. A classe
  correta é `[A-Za-zÀ-ÿ]`.
- **Verbos existem.** "o que a expressão **evidencia**", "como o espaço
  **influencia**" e "ele **providencia** que" estão certos sem acento — só os
  substantivos homógrafos levam. As duas ocorrências em que a palavra era mesmo
  substantivo (735, "a evidência do apetite"; 826, "o alcance da influência do
  professor") foram corrigidas uma a uma, não pela regra geral.
- **`comentario` e `imagem_alt` ficam fora da varredura.** Eles citam o texto
  original em inglês e respeitam a grafia do autor ("video evidence", "Musica
  Popular Brasileira" como a Economist grafou); ali a falta de acento não é
  defeito nosso.

A verificação usada na correção, e que vale para qualquer mexida de acento:
**retirados os diacríticos, o texto novo tem de ser idêntico ao antigo.** Só a
acentuação pode mudar.

## 13. Reprodução de letra e poema — pendência declarada

**Lote 33, 31/07/2026. Não é decisão editorial, e por isso não foi tomada.**

O acervo tem **30 questões** cujo gênero é letra de canção ou poema. **26 estão
publicadas com o texto integral** — ENEM (Paul McCartney, Bob Dylan, Madonna,
Alicia Keys, Langston Hughes, Robert Frost, John Donne, Joy Harjo), simulados
próprios e Fuvest (Maya Angelou na 1046, Langston Hughes na 1032, Taylor Swift
nas 1063 e 1064, esta última com 25 linhas).

Fora dessas, só quatro recebem tratamento diferente: **34, 105 e 112** estão
despublicadas, e a **1038** teve a letra substituída por uma nota descritiva.

Ou seja: **não existe uma política de direito autoral aplicada no acervo.**
Existem 26 casos publicados de um jeito e 4 casos tratados de outro, sem critério
que os separe — a 1038 e a 34 são a mesma canção de Bob Dylan, uma com nota e a
outra fora do ar. No lote 32 eu havia registrado que as despublicações se
explicavam por direito autoral; os números mostram que não.

Isso é decisão jurídica e comercial, não editorial, e envolve 26 questões que já
estão no ar. Fica para o professor decidir entre três caminhos:

1. **Manter tudo como está**, apoiado no uso didático com atribuição de fonte
   (a fonte está preenchida em todas).
2. **Uniformizar por baixo**, aplicando a todas o tratamento da 1038 — nota
   descritiva no lugar do texto, preservando no enunciado só os versos citados.
   Custo: mexe em 26 questões publicadas e muda a experiência de leitura.
3. **Uniformizar por cima**, republicando 34, 105 e 112 e devolvendo a letra à
   1038, o que torna o acervo coerente sem reduzir conteúdo.

Enquanto não houver decisão, nada foi alterado.


## Descrição de imagem ausente

**Ou a imagem está no item, ou não se fala dela no texto que o aluno lê.**

Cinquenta e sete questões traziam, dentro do texto-base, blocos como
`[Charge abaixo do texto: um homem de boina conversa animadamente…]` sem que
houvesse charge alguma na tela. O aluno lia, procurava a imagem, não achava, e
concluía que a página estava quebrada. Vinham da transcrição das provas: quem
digitou descreveu a peça visual em vez de recortá-la.

A decisão é por peça, não por questão — uma mesma charge serve a várias
questões da mesma prova —, e a pergunta é uma só: **o comando exige a imagem?**

- **Não exige** (o comando diz "According to the passage", "Segundo o texto", ou
  é item de gramática e vocabulário): a descrição sai. Foi o caso de 18 peças e
  56 questões, quase todas Fuvest de 1999 a 2026. A resposta está no texto; a
  descrição de uma imagem que não aparece é só ruído. As descrições continuam no
  histórico do git, caso um dia se decida subir as imagens.
- **Exige** (o comando diz "os elementos visuais e verbais da figura"): apagar a
  descrição deixaria a questão sem resposta. Aqui o conserto é a imagem. Foi o
  caso da 1047 (Fuvest 2022, cartum do Bizarro).

**De onde tirar a imagem:** da prova oficial, não de uma busca genérica. A da
1047 saiu do PDF da Fuvest (`fuvest.br`, primeira fase 2022 tipo V, página 14),
extraída com `pdfimages -f 14 -l 14 -png`. É a mesma procedência das outras 104
imagens do banco, e evita hospedar a foto de produto de algum vendedor.

**A descrição vai para `imagem_alt`, nunca para o texto-base.** É o campo que
existe para isso: quem usa leitor de tela ouve a cena, quem enxerga vê a imagem,
e ninguém lê a descrição de algo que não está lá. Lembrando que `imagem_alt` sem
`imagem` é invisível — o template só renderiza o alt dentro da tag `<img>`.

O `audita-imagens.js` confere as duas pontas: nenhuma descrição de imagem
ausente no texto, e nenhuma `imagem` apontando para arquivo que não existe no
disco (que renderiza ícone quebrado, pior que não ter imagem).


## Gabarito oficial é requisito de publicação

**Se a banca não publicou o gabarito, a questão não vai para o ar.**

Sessenta e oito questões de seis provas da Fuvest — 1977, 1998, 2001, 2002,
2003 e 2004 — traziam no comentário o aviso de que a resposta era leitura do
nosso time, não a oficial. Como aviso honesto, funcionava. Como produto que se
vende, não se sustenta: quem compra um banco de questões compra a resposta
certa, e "provavelmente é esta" não é resposta certa.

Foram **despublicadas, não apagadas**, por três motivos concretos:

- 39 delas já haviam caído em simulados, e o `questoesDo` faz JOIN em
  `questoes` **sem** filtrar `publicada` — despublicar preserva o histórico do
  aluno, apagar faria as respostas dele sumirem da revisão.
- `elegiveis()` filtra `publicada = 1`, então despublicar já as tira do sorteio
  dos próximos simulados, que era o efeito desejado.
- Se a Fuvest divulgar os gabaritos um dia, é só republicar.

**Quem já tinha respondido ganhou o ponto**, tendo acertado, errado ou deixado
em branco — é o tratamento de questão anulada, e ninguém pode ser prejudicado
por um gabarito que nós mesmos retiramos de circulação. Foram 32 notas para
cima e nenhuma para baixo. Na revisão, essas questões aparecem com o aviso
"Questão anulada — o ponto foi seu", porque sem ele o aluno leria "Você
acertou, marcou D e a correta é C" e concluiria que o site quebrou.

As seis provas saíram inteiras, sem deixar prova pela metade. O acervo publicado
foi de 1053 para 985, e o sorteio do simulado de 289 para 231 questões elegíveis.

## 14. Aspas

**Lote de tipografia, 31/07/2026.** A pendência registrada dizia "197 texto_base
e 67 título usam aspas retas onde o padrão do acervo é curvas". O levantamento
desmentiu a premissa — **o padrão não existe**:

| campo | retas | curvas |
|---|---|---|
| texto_base | 202 | 266 |
| titulo | 68 | 100 |
| enunciado | 99 | 142 |
| comentario | 644 | **341** |
| meta_description | 64 | 69 |
| imagem_alt | **115** | 6 |
| alternativas | 54 | 87 |

Em `comentario` e `imagem_alt` a aspa **reta** é que é a regra. Uniformizar o
acervo seria reforma de cerca de 1.500 campos por ganho estético, não correção de
defeito — **não foi feito, e a decisão é esta: não se uniformiza o estilo de
aspas entre campos.**

O defeito real é a **mistura dentro de um mesmo campo**, e esse foi corrigido:

- **Abre curva e fecha reta**: `“bioclimatic architecture"` nas questões 764-773,
  mais três enunciados (754, 755, 788) e dez comentários. Ao todo 28 questões.
- **Citação dentro de citação** passou a usar aspa simples curva, que é a forma
  correta: `“equipped with an ‘agile exoskeleton’ that…”` (600 e 784).

Uma armadilha que custou três tentativas: **contagem de aspas não é critério de
correção**. As questões 647-650 trazem falas de Hawking e de Milner na convenção
inglesa de **citação em vários parágrafos**, em que cada parágrafo abre aspas e só
o último fecha — 12 aberturas para 9 fechamentos, e está certo assim. Foram
convertidas trecho a trecho, não por regra. Por isso o `scripts/audita-aspas.js`
só acusa **fechamento sobrando**, nunca abertura sobrando.
