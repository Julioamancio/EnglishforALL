/* Banco de Questões — poeira de partículas do hero (sem dependências).

   Um campo denso de pontinhos de tamanhos variados, à deriva devagar. A bola
   não é desenhada: existe uma esfera invisível sob o cursor, e o que se vê é
   o efeito dela na poeira — os pontos por cima se afastam do centro e crescem,
   como acontece quando se olha através de uma bola de vidro. O olho monta a
   bola sozinho a partir da distorção, que é bem mais convincente do que
   desenhar a esfera.

   A conta é a de uma lente: um ponto a distância d do centro é empurrado para
   d * m, com m maior no meio e voltando a 1 na borda — assim a deformação
   termina sem emenda, sem um anel denunciando o limite.

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

  /* A densidade é o que faz a bola existir. Campo ralo vira céu estrelado e a
     deformação não tem textura suficiente para aparecer; é preciso poeira
     mesmo para o olho ver o vidro por cima dela. */
  var DENSIDADE = 300;    // um ponto a cada N px²: menor = mais poeira
  var TETO = 2200;        // acima disso o ganho visual some e o custo não
  var PISO = 260;
  var LENTE = 1.02;       // quanto a bola afasta e aumenta no centro
  var PERSEGUE = 0.22;    // 1 = grudada no cursor; menos que isso dá peso

  /* --------------------------------------------------------------- estado */

  var pontos = [];
  var larg = 0, alt = 0, dpr = 1, raio = 0;
  var quadro = 0, anterior = 0;
  var visivel = true, naTela = true;

  var cursorX = 0, cursorY = 0;
  var bolaX = 0, bolaY = 0;
  var forca = 0, alvoForca = 0;   // 0 = sem cursor, 1 = bola presente

  var corPonto = '47, 58, 178';
  var corBrilho = '69, 82, 224';
  var escuro = false;

  /* Trocar fillStyle e dar um fill por partícula custa caro: com 2600 pontos
     são 2600 strings montadas e 2600 chamadas por quadro. Em vez disso, a
     opacidade é arredondada para uma destas faixas, os pontos de cada faixa
     entram num Path2D só e cada faixa é pintada de uma vez. Passa de 2600
     fills para 24. */
  var NIVEIS = 24;
  var paleta = [];
  var TAU = Math.PI * 2;

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
    if (h) corBrilho = h;
    escuro = document.documentElement.dataset.tema === 'escuro';

    paleta.length = 0;
    for (var i = 0; i < NIVEIS; i++) {
      paleta.push('rgba(' + corPonto + ', ' + ((i + 1) / NIVEIS).toFixed(3) + ')');
    }
  }

  /* -------------------------------------------------------------- a poeira
     Muitos pontos minúsculos, poucos graúdos. O expoente puxa o sorteio para
     baixo: sem ele o campo vira um chuvisco uniforme, sem a variação de grão
     que faz a poeira parecer poeira. */

  function quantos() {
    var n = Math.round((larg * alt) / DENSIDADE);
    return Math.max(PISO, Math.min(TETO, n));
  }

  function novo() {
    var g = Math.pow(Math.random(), 2.4);   // 0 = grão fino, 1 = graúdo
    return {
      x: Math.random() * larg,
      y: Math.random() * alt,
      vx: (Math.random() - 0.5) * 0.13,
      vy: (Math.random() - 0.5) * 0.13,
      r: 0.28 + g * 1.75,
      /* Os graúdos brilham mais: é o que os põe à frente dos finos. */
      o: 0.14 + g * 0.60 + Math.random() * 0.14
    };
  }

  function popular() {
    var alvo = quantos();
    while (pontos.length > alvo) pontos.pop();
    while (pontos.length < alvo) pontos.push(novo());
  }

  /* -------------------------------------------------------------- tamanho */

  function medir() {
    var b = palco.getBoundingClientRect();
    var novaL = Math.max(1, Math.round(b.width));
    var novaA = Math.max(1, Math.round(b.height));
    if (novaL === larg && novaA === alt) return;

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

    raio = Math.max(105, Math.min(215, Math.min(larg, alt) * 0.38));
    popular();
  }

  /* --------------------------------------------------------------- física */

  function passo(dt) {
    /* A bola persegue o cursor quase junto, com um resto de atraso para não
       parecer colada no ponteiro. */
    bolaX += (cursorX - bolaX) * Math.min(1, PERSEGUE * dt);
    bolaY += (cursorY - bolaY) * Math.min(1, PERSEGUE * dt);
    forca += (alvoForca - forca) * Math.min(1, 0.10 * dt);

    for (var i = 0; i < pontos.length; i++) {
      var p = pontos[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < -8) p.x = larg + 8; else if (p.x > larg + 8) p.x = -8;
      if (p.y < -8) p.y = alt + 8; else if (p.y > alt + 8) p.y = -8;
    }
  }

  /* -------------------------------------------------------------- desenho */

  function pintar() {
    ctx.clearRect(0, 0, larg, alt);

    var brilhando = forca > 0.01;
    var raio2 = raio * raio;
    var opaco = escuro ? 1 : 0.78;

    /* Um clarão fraquíssimo sob a bola. Não desenha a esfera — só evita que
       a região deformada pareça um buraco sem motivo. */
    if (brilhando) {
      var g = ctx.createRadialGradient(bolaX, bolaY, 0, bolaX, bolaY, raio);
      g.addColorStop(0, 'rgba(' + corBrilho + ', ' + (0.11 * forca).toFixed(3) + ')');
      g.addColorStop(0.6, 'rgba(' + corBrilho + ', ' + (0.035 * forca).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + corBrilho + ', 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bolaX, bolaY, raio, 0, Math.PI * 2);
      ctx.fill();
    }

    var nivelAtual = -1;

    for (var i = 0; i < pontos.length; i++) {
      var p = pontos[i];
      var x = p.x, y = p.y, r = p.r, o = p.o;

      if (brilhando) {
        var dx = p.x - bolaX, dy = p.y - bolaY;
        var d2 = dx * dx + dy * dy;
        if (d2 < raio2) {
          var t = 1 - d2 / raio2;          // 1 no centro, 0 na borda
          var lupa = 1 + LENTE * t * t * forca;

          /* Empurra para fora ao longo do próprio raio: é o que abre espaço
             no meio e faz o campo escorregar em volta da bola. */
          x = bolaX + dx * lupa;
          y = bolaY + dy * lupa;

          /* Cresce e acende junto — sem isso a distorção parece um vazio, e
             não algo com volume subindo por baixo. */
          r = p.r * (1 + 1.15 * t * forca);
          o = p.o * (1 + 0.7 * t * forca);
        }
      }

      var nivel = Math.round(o * opaco * NIVEIS) - 1;
      if (nivel < 0) continue;
      if (nivel >= NIVEIS) nivel = NIVEIS - 1;
      if (nivel !== nivelAtual) {
        ctx.fillStyle = paleta[nivel];
        nivelAtual = nivel;
      }

      /* Abaixo de ~1px um quadrado e um círculo dão o mesmo pixel na tela, e
         fillRect é bem mais barato que montar e rasterizar um arco. A grande
         maioria dos grãos cai neste caso. */
      if (r < 1) {
        var l = r + r;
        ctx.fillRect(x - r, y - r, l, l);
      } else {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
      }
    }

    /* Um fio de luz na borda, por cima da poeira. A distorção sozinha o olho
       lê como "algo estranho ali"; é este contorno que fecha a leitura em
       "bola". Fraco de propósito — passando de sutil, vira um círculo
       desenhado e perde a graça de ser invisível. */
    if (brilhando) {
      var borda = ctx.createRadialGradient(bolaX, bolaY, raio * 0.82, bolaX, bolaY, raio * 1.04);
      borda.addColorStop(0, 'rgba(' + corBrilho + ', 0)');
      borda.addColorStop(0.72, 'rgba(' + corBrilho + ', ' + (0.16 * forca).toFixed(3) + ')');
      borda.addColorStop(0.9, 'rgba(' + corBrilho + ', ' + (0.05 * forca).toFixed(3) + ')');
      borda.addColorStop(1, 'rgba(' + corBrilho + ', 0)');
      ctx.fillStyle = borda;
      ctx.beginPath();
      ctx.arc(bolaX, bolaY, raio * 1.04, 0, Math.PI * 2);
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

  /* Com "reduzir movimento": a poeira aparece parada, sem bola. */
  function estatico() {
    pausar();
    forca = 0;
    alvoForca = 0;
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
      var b = palco.getBoundingClientRect();
      cursorX = ev.clientX - b.left;
      cursorY = ev.clientY - b.top;
      /* Primeira entrada: a bola nasce onde o cursor está, senão ela
         atravessa o hero inteiro para alcançá-lo. */
      if (alvoForca === 0) { bolaX = cursorX; bolaY = cursorY; }
      alvoForca = 1;
      tocar();
    }, { passive: true });

    var soltar = function () { alvoForca = 0; };
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
