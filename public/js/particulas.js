/* Banco de Questões — campo de partículas do hero (sem dependências).

   Constelação com profundidade: os pontos vivem em planos diferentes (z), então
   os da frente são maiores, mais nítidos e andam mais rápido que os do fundo —
   é isso que dá a sensação de volume. Um halo acompanha o cursor, se liga aos
   pontos por perto e empurra quem chega perto demais; ao sair, tudo volta ao
   lugar sozinho.

   Desliga sozinho quando o hero sai da tela, quando a aba fica oculta e quando
   o sistema pede "reduzir movimento" — nesse caso desenha um quadro parado, que
   ainda decora sem animar nada. */
(function () {
  'use strict';

  var tela = document.querySelector('[data-particulas]');
  if (!tela || !tela.getContext) return;

  var ctx = tela.getContext('2d');
  if (!ctx) return;

  var palco = tela.parentElement;
  if (!palco) return;

  /* ------------------------------------------------------------ ajustes */

  var DENSIDADE = 16000;  // um ponto a cada N px² de hero
  var TETO = 86;          // nunca mais que isto, custe o que custar
  var PISO = 18;
  var LIGACAO = 128;      // distância máxima para ligar dois pontos
  var ALCANCE = 170;      // raio de influência do cursor
  var ATRITO = 0.90;      // o quanto do empurrão sobra a cada quadro

  /* --------------------------------------------------------------- estado */

  var pontos = [];
  var larg = 0, alt = 0, dpr = 1;
  var quadro = 0, anterior = 0;
  var visivel = true, naTela = true;

  var cursorX = 0, cursorY = 0;   // onde o cursor está
  var haloX = 0, haloY = 0;       // onde o halo está (persegue o cursor)
  var forca = 0, alvoForca = 0;   // 0 = cursor fora, 1 = cursor dentro

  var corPonto = '47, 58, 178';
  var corHalo = '69, 82, 224';
  var escuro = false;

  var menosMovimento = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  var temHover = window.matchMedia
    ? window.matchMedia('(hover: hover) and (pointer: fine)')
    : null;

  function parado() { return !!(menosMovimento && menosMovimento.matches); }
  function apontavel() { return !temHover || temHover.matches; }

  /* ---------------------------------------------------------------- cores
     Ficam em variáveis CSS para acompanharem o tema claro/escuro sem que este
     arquivo precise saber nada sobre a paleta. */

  function lerCores() {
    var s = getComputedStyle(document.documentElement);
    var p = (s.getPropertyValue('--particula-rgb') || '').trim();
    var h = (s.getPropertyValue('--particula-halo-rgb') || '').trim();
    if (p) corPonto = p;
    if (h) corHalo = h;
    escuro = document.documentElement.dataset.tema === 'escuro';
  }

  /* -------------------------------------------------------------- tamanho */

  function quantos() {
    var n = Math.round((larg * alt) / DENSIDADE);
    return Math.max(PISO, Math.min(TETO, n));
  }

  function novo(x, y) {
    var z = 0.35 + Math.random() * 0.65;
    return {
      x: x, y: y,
      vx: (Math.random() - 0.5) * 0.24,
      vy: (Math.random() - 0.5) * 0.24,
      z: z,
      r: 0.8 + z * 1.9,
      ox: 0, oy: 0,   // deslocamento causado pelo cursor
      px: x, py: y    // posição desenhada neste quadro
    };
  }

  function popular() {
    var alvo = quantos();
    while (pontos.length > alvo) pontos.pop();
    while (pontos.length < alvo) {
      pontos.push(novo(Math.random() * larg, Math.random() * alt));
    }
  }

  function medir() {
    var r = palco.getBoundingClientRect();
    var novaL = Math.max(1, Math.round(r.width));
    var novaA = Math.max(1, Math.round(r.height));
    if (novaL === larg && novaA === alt) return;

    /* Reposiciona proporcionalmente: redimensionar a janela não deve jogar
       metade dos pontos para fora nem amontoá-los num canto. */
    if (larg && alt) {
      var fx = novaL / larg, fy = novaA / alt;
      for (var i = 0; i < pontos.length; i++) {
        pontos[i].x *= fx;
        pontos[i].y *= fy;
      }
    }

    larg = novaL;
    alt = novaA;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    tela.width = Math.round(larg * dpr);
    tela.height = Math.round(alt * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    popular();
  }

  /* --------------------------------------------------------------- física */

  function passo(dt) {
    var i, p;

    /* O halo persegue o cursor com atraso — é o atraso que dá peso a ele. */
    haloX += (cursorX - haloX) * Math.min(1, 0.12 * dt);
    haloY += (cursorY - haloY) * Math.min(1, 0.12 * dt);
    forca += (alvoForca - forca) * Math.min(1, 0.07 * dt);

    var raio2 = ALCANCE * ALCANCE;

    for (i = 0; i < pontos.length; i++) {
      p = pontos[i];

      p.x += p.vx * p.z * dt;
      p.y += p.vy * p.z * dt;

      /* Atravessou uma borda, entra pela outra. A margem evita o ponto sumir
         e reaparecer no mesmo pixel, o que pisca. */
      if (p.x < -20) p.x = larg + 20; else if (p.x > larg + 20) p.x = -20;
      if (p.y < -20) p.y = alt + 20; else if (p.y > alt + 20) p.y = -20;

      if (forca > 0.01) {
        var dx = p.x + p.ox - haloX;
        var dy = p.y + p.oy - haloY;
        var d2 = dx * dx + dy * dy;
        if (d2 < raio2 && d2 > 1) {
          var d = Math.sqrt(d2);
          var f = 1 - d / ALCANCE;
          /* Ao quadrado: perto o empurrão é firme, longe some de vez. Os
             pontos da frente (z alto) reagem mais — de novo, profundidade. */
          var e = f * f * 1.9 * p.z * forca * dt;
          p.ox += (dx / d) * e;
          p.oy += (dy / d) * e;
        }
      }

      /* Sem cursor por perto o deslocamento se dissolve e o ponto volta à
         trajetória original. */
      var sobra = Math.pow(ATRITO, dt);
      p.ox *= sobra;
      p.oy *= sobra;

      p.px = p.x + p.ox;
      p.py = p.y + p.oy;
    }
  }

  /* -------------------------------------------------------------- desenho */

  function pintar() {
    ctx.clearRect(0, 0, larg, alt);

    var i, j, a, b, dx, dy, d2, d, alfa;
    var lig2 = LIGACAO * LIGACAO;
    var raio2 = ALCANCE * ALCANCE;

    var opacoPonto = escuro ? 0.62 : 0.52;
    var opacoLinha = escuro ? 0.20 : 0.16;
    var opacoCabo = escuro ? 0.40 : 0.32;

    /* 1. Halo do cursor: um gradiente radial largo e fraco. É ele que dá a
       impressão de uma bola de luz passeando por baixo dos pontos. */
    if (forca > 0.01) {
      var g = ctx.createRadialGradient(haloX, haloY, 0, haloX, haloY, ALCANCE);
      g.addColorStop(0, 'rgba(' + corHalo + ', ' + (0.20 * forca).toFixed(3) + ')');
      g.addColorStop(0.45, 'rgba(' + corHalo + ', ' + (0.07 * forca).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + corHalo + ', 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(haloX, haloY, ALCANCE, 0, Math.PI * 2);
      ctx.fill();
    }

    /* 2. Linhas entre pontos vizinhos. O alfa cai com a distância, então a
       teia aparece e some sozinha conforme eles se cruzam. */
    ctx.lineWidth = 1;
    for (i = 0; i < pontos.length; i++) {
      a = pontos[i];
      for (j = i + 1; j < pontos.length; j++) {
        b = pontos[j];
        dx = a.px - b.px;
        dy = a.py - b.py;
        d2 = dx * dx + dy * dy;
        if (d2 > lig2) continue;
        d = Math.sqrt(d2);
        alfa = (1 - d / LIGACAO) * opacoLinha * (0.45 + (a.z + b.z) * 0.35);
        ctx.strokeStyle = 'rgba(' + corPonto + ', ' + alfa.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(a.px, a.py);
        ctx.lineTo(b.px, b.py);
        ctx.stroke();
      }
    }

    /* 3. Cabos do cursor até os pontos ao alcance — o "estou ligado a isto". */
    if (forca > 0.01) {
      for (i = 0; i < pontos.length; i++) {
        a = pontos[i];
        dx = a.px - haloX;
        dy = a.py - haloY;
        d2 = dx * dx + dy * dy;
        if (d2 > raio2) continue;
        d = Math.sqrt(d2);
        alfa = (1 - d / ALCANCE) * opacoCabo * forca;
        ctx.strokeStyle = 'rgba(' + corHalo + ', ' + alfa.toFixed(3) + ')';
        ctx.lineWidth = 0.6 + a.z * 0.7;
        ctx.beginPath();
        ctx.moveTo(haloX, haloY);
        ctx.lineTo(a.px, a.py);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    }

    /* 4. Os pontos por último, para ficarem por cima das linhas. Quem está
       dentro do halo acende um pouco. */
    for (i = 0; i < pontos.length; i++) {
      a = pontos[i];
      alfa = opacoPonto * (0.35 + a.z * 0.65);
      var cor = corPonto;
      if (forca > 0.01) {
        dx = a.px - haloX;
        dy = a.py - haloY;
        d2 = dx * dx + dy * dy;
        if (d2 < raio2) {
          var perto = 1 - Math.sqrt(d2) / ALCANCE;
          alfa = Math.min(1, alfa + perto * 0.45 * forca);
          cor = corHalo;
        }
      }
      ctx.fillStyle = 'rgba(' + cor + ', ' + alfa.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(a.px, a.py, a.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ------------------------------------------------------------ animação */

  function laco(agora) {
    quadro = 0;
    /* dt em múltiplos de 16,7 ms e travado em 3: se a aba ficou congelada, o
       primeiro quadro de volta não pode teletransportar tudo. */
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

  /* Com "reduzir movimento" nada se mexe: um quadro só, parado, sem cursor. */
  function estatico() {
    pausar();
    forca = 0;
    alvoForca = 0;
    for (var i = 0; i < pontos.length; i++) {
      pontos[i].ox = 0;
      pontos[i].oy = 0;
      pontos[i].px = pontos[i].x;
      pontos[i].py = pontos[i].y;
    }
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
      if (alvoForca === 0) { haloX = cursorX; haloY = cursorY; }
      alvoForca = 1;
      tocar();
    }, { passive: true });

    palco.addEventListener('pointerleave', function () { alvoForca = 0; }, { passive: true });
    palco.addEventListener('pointercancel', function () { alvoForca = 0; }, { passive: true });
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
      if (!rodando()) pintar();
    }).observe(palco);
  } else {
    window.addEventListener('resize', function () {
      medir();
      if (!rodando()) pintar();
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
