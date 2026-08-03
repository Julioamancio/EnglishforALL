# Prompt padrão para os vídeos dos personagens

Modelo para gerar o vídeo *idle* de cada personagem da gramática, no Flow.

Só o trecho **em negrito** muda de personagem para personagem. O resto é fixo, e
cada linha dele existe por um motivo — todas foram aprendidas errando.

---

## O prompt

> Personagem de desenho 3D, **[DESCRIÇÃO DO PERSONAGEM]**, em pé, de frente,
> corpo inteiro visível dos cabelos até os pés.
>
> Animação *idle* sutil e contínua: respiração leve, piscar de olhos ocasional,
> pequeno balanço do corpo. Os pés permanecem parados no mesmo lugar. Sem
> caminhar, sem gesto grande, sem virar de costas.
>
> **Fundo preto sólido, #000000, absolutamente uniforme.**
>
> **Sem sombra no chão. Sem plataforma. Sem brilho, halo ou luz sob os pés. Sem
> reflexo. Sem partículas, faíscas ou poeira. O personagem flutua sobre o preto,
> sem apoio visível de nenhum tipo.**
>
> **Sem áudio, sem fala, sem narração, sem música. O personagem não fala: boca
> fechada ou sorriso leve, sem movimento de lábios articulando palavras.**
>
> Iluminação frontal e suave, sem contraluz forte que crie borda brilhante.
>
> O último quadro deve ser igual ao primeiro, para o vídeo repetir em laço sem
> corte perceptível.
>
> 8 segundos. Vertical 9:16. O personagem ocupa cerca de 80% da altura do
> quadro, centralizado, com margem vazia em cima e embaixo.

---

## A parte que muda

| personagem | descrição |
|---|---|
| **Sofia** | mulher adulta, cabelo castanho preso em coque, óculos redondos, cardigã rosa claro, saia marrom, segurando livros coloridos junto ao corpo, mão livre relaxada ao lado |
| **Maya** | menina negra de uns 8 anos, dois coques de cabelo cacheado com laços amarelos, camiseta amarela, jardineira jeans azul clara, tênis amarelos, uma das mãos aberta como quem apresenta |
| **Leo** | raposa laranja e branca em pé, bípede, mochila verde, lenço azul no pescoço, cauda felpuda, dedo indicador levantado |
| **Max** | robô branco e azul claro, cabeça arredondada com visor escuro e olhos azuis brilhantes, antena com esfera verde no topo, dedo indicador levantado |

---

## Por que cada exigência está aí

**Fundo preto, e não verde nem branco.** Foi medido nos quatro personagens:

| fundo | Sofia | Maya | Leo | Max |
|---|---|---|---|---|
| preto | ~2% | ~3% | ~2% | ~2% |
| branco | 3–23% | 4–19% | 6–23% | 10–32% |
| verde | 0,00% | 0,01% | 0,01% | 1–2% |

A porcentagem é quanto do personagem o recorte comeria. Branco é péssimo porque
eles são claros — o Max *é* branco. Verde seria ótimo para três, mas a antena do
Max tem matiz 115°, e o verde de chroma tem 120° a 142°: praticamente a mesma
cor, a antena sumiria. O preto funciona para todos, e o vídeo do Leo saiu
perfeito de primeira com ele.

**Sem sombra e sem plataforma.** Foi isto que estragou o Max e a Maya, não o
fundo. A Maya vinha com uma mancha escura sob cada tênis, colada no pé; o Max
ganhava uma plataforma luminosa em alguns quadros — clara, mediana 206 de
`max(RGB)`, ou seja, parte do desenho e não resto de fundo. Nenhuma cor de fundo
resolve isso: sombra e plataforma sobrevivem ao recorte porque *são* o
personagem. Tem que não existir na origem.

**Pés parados.** Se o personagem anda ou deriva, o enquadramento tem que cobrir
todo o trajeto e ele fica pequeno na tela — os quatro precisam sair do mesmo
tamanho aparente para ficarem alinhados na página.

**Último quadro igual ao primeiro.** O vídeo repete em laço a cada 8 segundos.
Sem isso, o aluno vê um solavanco toda vez que reinicia.

**Sem contraluz.** Borda brilhante vira franja clara em volta do recorte, que
aparece como um contorno sujo sobre o fundo da página.

---

## Depois de receber os vídeos

```bash
python3 scripts/processa-persona.py ORIGEM.mp4 sofia
```

Gera o WebM com transparência direto em `public/video/personas/`. O site liga o
vídeo sozinho no próximo restart; sem o arquivo, continua na imagem.

Confira antes de aceitar: extraia um quadro e componha sobre fundo magenta. Se
aparecer qualquer mancha escura sob os pés, o vídeo precisa ser refeito — não
tente consertar no recorte, porque a mancha está grudada no personagem.

---

## Se o Flow falhar

**"Falha ao gerar áudio"** — o erro é do som, não do vídeo. Nas configurações do
Flow, marque para retornar vídeos **sem áudio**. O site toca os personagens
mudos de qualquer jeito: o processamento descarta a trilha.

Se persistir, o gatilho costuma estar em palavras que sugerem alguém falando —
"professora", "acenando", "cumprimentando", "apresentando". Foi por isso que a
Sofia deixou de ser "professora acenando" e virou "mulher adulta com os livros
junto ao corpo". O papel dela aparece na página, no texto ao lado; o vídeo só
precisa dela em pé, viva e quieta.
