/* Banco de Questões — esfera de partículas do hero (sem dependências).

   Uma bola feita de pontos: eles ficam na superfície de uma esfera, ela gira
   devagar e é projetada em perspectiva, então quem está na frente aparece
   grande e nítido e quem está atrás fica pequeno e apagado. É essa diferença
   que faz o olho ler uma bola, e não um borrão.

   A bola persegue o cursor com atraso — o atraso é o que dá peso a ela — e
   volta ao lugar de descanso quando o mouse sai. Atrás dela, um punhado de
   pontinhos soltos dá textura ao fundo.

   Desliga sozinho fora da tela, em aba oculta e com "reduzir movimento". */
(function () {
  'use strict';

  var tela = document.querySelector('[data-particulas]');
  if (!tela || !tela.getContext) return;

  var ctx = tela.getContext('2d');
  if (!ctx) return;

  var palco = tela.parentElement;
  if (!palco) return;

  /* ------------------------------------------------------------ ajustes */

  var NA_BOLA = 150;      // pontos na superfície da esfera
  var MALHA = 0.42;       // distância 3D máxima (em raios) para ligar dois pontos
  var FOCO = 2.6;         // distância do olho, em raios: menor = mais perspectiva
  var GIRO = 0.0042;      // radianos por quadro
  var POEIRA = 34;        // pontinhos soltos no fundo

  /* Onde a bola descansa quando ninguém mexe: à direita, longe do texto. */
  var CASA_X = 0.74, CASA_Y = 0.50;

  /* O quanto ela chega a percorrer até o cursor. Em 1 ela pousaria bem em
     cima do mouse — e, com o cursor sobre o título, cobriria a manchete. Em
     0,58 ela se inclina claramente na direção do mouse sem largar o canto
     dela, que é onde não atrapalha a leitura. */
  var SEGUE = 0.58;

  /* --------------------------------------------------------------- estado */

  var bola = [];          // {x,y,z} unitários na esfera
  var poeira = [];
  var larg = 0, alt = 0, dpr = 1, raio = 0;
  var quadro = 0, anterior = 0;
  var visivel = true, naTela = true;

  var giro = 0.6;         // ângulo acumulado em torno do eixo vertical
  var balanco = 0;        // oscilação lenta do eixo, para não parecer um pião

  var cursorX = 0, cursorY = 0;
  var alvoX = 0, alvoY = 0;   // para onde a bola quer ir
  var centroX = 0, centroY = 0;
  var seguindo = false;

  var corPonto = '47, 58, 178';
  var corBola = '69, 82, 224';
  var escuro = false;

  var menosMovimento = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  var temHover = window.matchMedia
    ? window.matchMedia('(hover: hover) and (pointer: fine)')
    : null;

  function parado() { return !!(menosMovimento && menosMovimento.matches); }
  function apontavel() { return !temHover || temHover.matches; }

  /* ---------------------------------------------------------------- cores */

  function lerCores() {
    var s = getComputedStyle(document.documentElement);
    var p = (s.getPropertyValue('--particula-rgb') || '').trim();
    var h = (s.getPropertyValue('--particula-halo-rgb') || '').trim();
    if (p) corPonto = p;
    if (h) corBola = h;
    escuro = document.documentElement.dataset.tema === 'escuro';
  }

  /* ------------------------------------------------------------- a esfera
     Espiral de Fibonacci: é o jeito barato de espalhar N pontos numa esfera
     sem eles se amontoarem nos polos, como aconteceria com laço de lat/long. */

  function montarBola() {
    bola.length = 0;
    var passoAng = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < NA_BOLA; i++) {
      var y = 1 - (i / (NA_BOLA - 1)) * 2;
      var r = Math.sqrt(Math.max(0, 1 - y * y));
      var a = passoAng * i;
      bola.push({
        x: Math.cos(a) * r, y: y, z: Math.sin(a) * r,
        px: 0, py: 0, pr: 0, pf: 0   // projeção deste quadro
      });
    }
  }

  function montarPoeira() {
    poeira.length = 0;
    var n = Math.round(POEIRA * Math.min(1.4, (larg * alt) / 700000)) || 8;
    for (var i = 0; i < n; i++) {
      poeira.push({
        x: Math.random() * larg,
        y: Math.random() * alt,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        r: 0.7 + Math.random() * 1.1,
        o: 0.2 + Math.random() * 0.3
      });
    }
  }

  /* -------------------------------------------------------------- tamanho */

  function medir() {
    var b = palco.getBoundingClientRect();
    var novaL = Math.max(1, Math.round(b.width));
    var novaA = Math.max(1, Math.round(b.height));
    if (novaL === larg && novaA === alt) return;

    larg = novaL;
    alt = novaA;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    tela.width = Math.round(larg * dpr);
    tela.height = Math.round(alt * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* A bola acompanha o tamanho do hero, mas o teto vem da altura: com a
       perspectiva ela cresce até ~1,6x na frente, e passar disso faz a esfera
       encostar nas bordas e parecer cortada. */
    raio = Math.max(66, Math.min(150, Math.min(larg * 0.16, alt * 0.28)));

    if (!bola.length) montarBola();
    montarPoeira();

    mirar();
    if (!centroX && !centroY) { centroX = alvoX; centroY = alvoY; }
  }

  /* --------------------------------------------------------------- física */

  /* Onde a bola quer estar: no canto dela, puxada na direção do cursor. */
  function mirar() {
    var casaX = larg * CASA_X, casaY = alt * CASA_Y;
    if (!seguindo) { alvoX = casaX; alvoY = casaY; return; }
    alvoX = casaX + (cursorX - casaX) * SEGUE;
    alvoY = casaY + (cursorY - casaY) * SEGUE;
  }

  function passo(dt) {
    giro += GIRO * dt;
    balanco += 0.006 * dt;

    /* Perseguição com atraso. Devagar de propósito: a bola tem massa. */
    centroX += (alvoX - centroX) * Math.min(1, 0.055 * dt);
    centroY += (alvoY - centroY) * Math.min(1, 0.055 * dt);

    /* Eixo inclinado: um pouco fixo, um pouco oscilando, e um empurrão de
       acordo com a altura do cursor — a bola parece olhar para o mouse. */
    var desvio = (centroY / Math.max(1, alt) - 0.5) * 0.6;
    var inclina = -0.34 + Math.sin(balanco) * 0.12 + desvio;

    var cg = Math.cos(giro), sg = Math.sin(giro);
    var ci = Math.cos(inclina), si = Math.sin(inclina);

    for (var i = 0; i < bola.length; i++) {
      var p = bola[i];

      // gira em torno do eixo vertical
      var x = p.x * cg - p.z * sg;
      var z = p.x * sg + p.z * cg;
      // depois tomba o eixo para a frente
      var y = p.y * ci - z * si;
      z = p.y * si + z * ci;

      /* Perspectiva: quem está mais perto do olho (z alto) cresce. */
      var f = FOCO / (FOCO - z);
      p.px = centroX + x * raio * f;
      p.py = centroY + y * raio * f;
      p.pz = z;
      p.pf = f;
      p.pr = (0.55 + (f - 1) * 2.4) * 1.5;
    }

    /* Depois da projeção: de trás para a frente, para o desenho empilhar certo. */
    bola.sort(function (a, b) { return a.pz - b.pz; });

    for (var j = 0; j < poeira.length; j++) {
      var q = poeira[j];
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (q.x < -10) q.x = larg + 10; else if (q.x > larg + 10) q.x = -10;
      if (q.y < -10) q.y = alt + 10; else if (q.y > alt + 10) q.y = -10;
    }
  }

  /* -------------------------------------------------------------- desenho */

  function pintar() {
    ctx.clearRect(0, 0, larg, alt);

    var i, j, a, b, alfa;
    var opacoPoeira = escuro ? 0.55 : 0.42;
    var opacoMalha = escuro ? 0.30 : 0.19;
    var opacoPonto = escuro ? 0.95 : 0.85;

    /* 1. Poeira do fundo, bem discreta. */
    for (i = 0; i < poeira.length; i++) {
      var q = poeira[i];
      ctx.fillStyle = 'rgba(' + corPonto + ', ' + (q.o * opacoPoeira).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
      ctx.fill();
    }

    /* 2. Brilho por trás da bola, para ela assentar no fundo em vez de flutuar. */
    var g = ctx.createRadialGradient(centroX, centroY, 0, centroX, centroY, raio * 2.1);
    g.addColorStop(0, 'rgba(' + corBola + ', ' + (escuro ? 0.16 : 0.13) + ')');
    g.addColorStop(0.5, 'rgba(' + corBola + ', ' + (escuro ? 0.05 : 0.04) + ')');
    g.addColorStop(1, 'rgba(' + corBola + ', 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(centroX, centroY, raio * 2.1, 0, Math.PI * 2);
    ctx.fill();

    /* 3. A malha. Liga vizinhos próximos em 3D, então as linhas seguem a
       curvatura da bola; as do lado de trás saem mais fracas. */
    var limite = MALHA * MALHA;
    for (i = 0; i < bola.length; i++) {
      a = bola[i];
      for (j = i + 1; j < bola.length; j++) {
        b = bola[j];
        var dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
        var d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > limite) continue;
        var prof = ((a.pf - 1) + (b.pf - 1)) * 0.5;   // 0 = fundo, ~0.6 = frente
        alfa = opacoMalha * (0.12 + prof * 1.7);
        if (alfa <= 0.004) continue;
        ctx.strokeStyle = 'rgba(' + corBola + ', ' + alfa.toFixed(3) + ')';
        ctx.lineWidth = 0.5 + prof * 1.1;
        ctx.beginPath();
        ctx.moveTo(a.px, a.py);
        ctx.lineTo(b.px, b.py);
        ctx.stroke();
      }
    }

    /* 4. Os pontos, do fundo para a frente. O tamanho e o brilho vêm da
       perspectiva — é aqui que a profundidade fica evidente. */
    for (i = 0; i < bola.length; i++) {
      a = bola[i];
      var d = a.pf - 1;
      alfa = opacoPonto * (0.14 + d * 1.9);
      if (alfa <= 0.01) continue;
      ctx.fillStyle = 'rgba(' + corBola + ', ' + Math.min(1, alfa).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(a.px, a.py, Math.max(0.4, a.pr), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ------------------------------------------------------------ animação */

  function laco(agora) {
    quadro = 0;
    var dt = anterior ? Math.min(3, (agora - anterior) / 16.7) : 1;
    anterior = agora;
    passo(dt);
    pintar();
    if (rodando()) quadro = requestAnimationFrame(laco);
  }

  function rodando() { return visivel && naTela && !parado(); }

  function tocar() {
    if (!rodando()) return;
    if (quadro) return;
    anterior = 0;
    quadro = requestAnimationFrame(laco);
  }

  function pausar() {
    if (!quadro) return;
    cancelAnimationFrame(quadro);
    quadro = 0;
  }

  /* Com "reduzir movimento" a bola aparece parada no lugar de descanso. */
  function estatico() {
    pausar();
    seguindo = false;
    mirar();
    centroX = alvoX;
    centroY = alvoY;
    passo(0);
    pintar();
  }

  function retomar() {
    if (parado()) estatico();
    else tocar();
  }

  /* --------------------------------------------------------------- cursor */

  if (apontavel()) {
    palco.addEventListener('pointermove', function (ev) {
      if (ev.pointerType === 'touch') return;
      var r = palco.getBoundingClientRect();
      cursorX = ev.clientX - r.left;
      cursorY = ev.clientY - r.top;
      seguindo = true;
      mirar();
      tocar();
    }, { passive: true });

    var soltar = function () { seguindo = false; mirar(); };
    palco.addEventListener('pointerleave', soltar, { passive: true });
    palco.addEventListener('pointercancel', soltar, { passive: true });
  }

  /* ------------------------------------------------------------- gatilhos */

  document.addEventListener('visibilitychange', function () {
    visivel = !document.hidden;
    if (visivel) retomar(); else pausar();
  });

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entradas) {
      naTela = entradas[0].isIntersecting;
      if (naTela) retomar(); else pausar();
    }, { threshold: 0 }).observe(palco);
  }

  if (window.ResizeObserver) {
    new ResizeObserver(function () {
      medir();
      if (!rodando()) { passo(0); pintar(); }
    }).observe(palco);
  } else {
    window.addEventListener('resize', function () {
      medir();
      if (!rodando()) { passo(0); pintar(); }
    });
  }

  /* O botão de tema troca o atributo em <html>; as cores precisam segui-lo. */
  new MutationObserver(function () {
    lerCores();
    if (!rodando()) pintar();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });

  if (menosMovimento) {
    var mudouMovimento = function () { retomar(); };
    if (menosMovimento.addEventListener) menosMovimento.addEventListener('change', mudouMovimento);
    else if (menosMovimento.addListener) menosMovimento.addListener(mudouMovimento);
  }

  /* ---------------------------------------------------------------- start */

  lerCores();
  medir();
  retomar();
})();
