/* Banco de Questões — interações do site (sem dependências) */
(function () {
  'use strict';

  /* ------------------------------------------------------ menu do celular
     O painel é escondido por CSS até 860px; aqui só se alterna a classe e o
     aria-expanded, que é o que o leitor de tela anuncia. */
  var botaoNav = document.querySelector('.nav-abrir');
  var navPrincipal = document.getElementById('nav-principal');
  if (botaoNav && navPrincipal) {
    var fecharNav = function () {
      navPrincipal.classList.remove('aberto');
      botaoNav.setAttribute('aria-expanded', 'false');
      botaoNav.setAttribute('aria-label', 'Abrir menu');
    };

    botaoNav.addEventListener('click', function () {
      var aberto = navPrincipal.classList.toggle('aberto');
      botaoNav.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      botaoNav.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
    });

    /* Navegar para outra página deve fechar o painel; um submenu, não. */
    navPrincipal.addEventListener('click', function (e) {
      if (e.target.closest('a')) fecharNav();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navPrincipal.classList.contains('aberto')) {
        fecharNav();
        botaoNav.focus();
      }
    });

    /* Ao voltar para largura de desktop o painel some por CSS: o estado
       precisa acompanhar, senão o aria-expanded fica mentindo. */
    var largura = window.matchMedia('(min-width: 861px)');
    var aoMudar = function (ev) { if (ev.matches) fecharNav(); };
    if (largura.addEventListener) largura.addEventListener('change', aoMudar);
    else if (largura.addListener) largura.addListener(aoMudar);
  }

  /* ------------------------------------------------ tema claro/escuro */
  var botaoTema = document.querySelector('.tema-btn');
  if (botaoTema) {
    botaoTema.addEventListener('click', function () {
      var novo = document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro';
      document.documentElement.dataset.tema = novo;
      try { localStorage.setItem('tema', novo); } catch (e) {}
    });
  }

  /* ------------------------------------------------ questão interativa
     Transforma as alternativas em botões: o aluno escolhe, recebe
     feedback imediato e o gabarito comentado abre sozinho.        */
  var quiz = document.querySelector('[data-gabarito]');
  if (quiz) {
    var gabarito = quiz.dataset.gabarito;
    var alternativas = Array.prototype.slice.call(quiz.querySelectorAll('.alt'));
    var detalhes = document.querySelector('.gabarito');
    var respondido = false;

    alternativas.forEach(function (alt) {
      alt.classList.add('alt--btn');
      alt.setAttribute('role', 'button');
      alt.setAttribute('tabindex', '0');

      function responder() {
        if (respondido) return;
        respondido = true;

        var letra = alt.dataset.letra;
        var acertou = letra === gabarito;

        alternativas.forEach(function (a) {
          a.classList.remove('alt--btn');
          a.removeAttribute('tabindex');
          a.setAttribute('aria-disabled', 'true');
          if (a.dataset.letra === gabarito) a.classList.add('alt--correta');
        });
        if (!acertou) alt.classList.add('alt--errada');

        var fb = document.createElement('p');
        fb.className = 'feedback ' + (acertou ? 'feedback--ok' : 'feedback--erro');
        fb.setAttribute('role', 'status');
        fb.innerHTML = acertou
          ? '<strong>Acertou!</strong> A resposta é a alternativa ' + gabarito + '.'
          : '<strong>Não foi dessa vez.</strong> Você marcou ' + letra + '; a correta é ' + gabarito + '.';
        quiz.after(fb);

        if (detalhes) {
          detalhes.open = true;
          setTimeout(function () {
            fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 120);
        }
      }

      alt.addEventListener('click', responder);
      alt.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); responder(); }
      });
    });
  }

  /* ------------------------------------------------ filtros dinâmicos
     Na lista: selects aplicam o filtro sozinhos e a busca filtra os
     cards na hora, sem esperar o servidor.                        */
  var toolbar = document.querySelector('.toolbar');
  if (toolbar) {
    toolbar.querySelectorAll('select').forEach(function (sel) {
      sel.addEventListener('change', function () { toolbar.submit(); });
    });

    var busca = toolbar.querySelector('input[name="q"]');
    var cards = Array.prototype.slice.call(document.querySelectorAll('.grade .card'));
    var contador = document.querySelector('.resultado-n strong');

    if (busca && cards.length) {
      busca.addEventListener('input', function () {
        var termo = busca.value.trim().toLowerCase();
        var visiveis = 0;
        cards.forEach(function (card) {
          var mostra = !termo || card.textContent.toLowerCase().indexOf(termo) !== -1;
          card.style.display = mostra ? '' : 'none';
          if (mostra) visiveis++;
        });
        if (contador) contador.textContent = visiveis;
      });
    }
  }
})();

/* ------------------------------------------------ menus dropdown (home) */
(function () {
  'use strict';
  var menus = Array.prototype.slice.call(document.querySelectorAll('details.menu'));
  if (!menus.length) return;

  menus.forEach(function (m) {
    m.addEventListener('toggle', function () {
      if (m.open) menus.forEach(function (o) { if (o !== m) o.open = false; });
    });
  });
  document.addEventListener('click', function (ev) {
    if (!ev.target.closest('details.menu')) menus.forEach(function (m) { m.open = false; });
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') menus.forEach(function (m) { m.open = false; });
  });
})();

// mini-teste da gramática: marca certo/errado, mostra a explicação e
// atualiza o placar da página de teste (quando existir).
(function () {
  var quizzes = document.querySelectorAll('.quiz');
  var placar = document.querySelector('[data-placar]');

  function atualizaPlacar() {
    if (!placar) return;
    var feitos = 0, acertos = 0;
    quizzes.forEach(function (q) {
      if (q.dataset.feito) {
        feitos++;
        if (q.dataset.acertou === '1') acertos++;
      }
    });
    if (!feitos) return;
    placar.hidden = false;
    var texto = placar.querySelector('[data-placar-texto]');
    var barra = placar.querySelector('[data-placar-barra]');
    if (texto) {
      texto.textContent = feitos < quizzes.length
        ? 'Acertos: ' + acertos + ' de ' + feitos + ' respondidas (' + quizzes.length + ' no total)'
        : 'Resultado final: ' + acertos + ' de ' + quizzes.length + (acertos === quizzes.length ? ' — perfeito! 🎉' : '');
    }
    if (barra) barra.style.width = Math.round((acertos / quizzes.length) * 100) + '%';
  }

  quizzes.forEach(function (quiz) {
    var correta = parseInt(quiz.dataset.correta, 10);
    var botoes = quiz.querySelectorAll('.quiz__opcao');
    botoes.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (quiz.dataset.feito) return;
        quiz.dataset.feito = '1';
        var i = parseInt(btn.dataset.i, 10);
        quiz.dataset.acertou = i === correta ? '1' : '0';
        botoes.forEach(function (b) {
          b.disabled = true;
          if (parseInt(b.dataset.i, 10) === correta) b.classList.add('quiz__opcao--certa');
        });
        if (i !== correta) btn.classList.add('quiz__opcao--errada');
        var exp = quiz.querySelector('.quiz__explica');
        if (exp) exp.hidden = false;
        atualizaPlacar();
      });
    });
  });
})();
