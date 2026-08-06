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

/* ==================================================== exercícios de gramática
   Um player de quiz para o teste completo (/exercicios/...) e correção simples
   para o mini-teste dentro da página de teoria.

   O servidor manda TODAS as questões no HTML. Quando existe [data-arena], este
   código assume o comando e passa a mostrar uma questão por vez; sem ele — ou
   sem JavaScript — a página continua sendo a lista de sempre, que funciona e é
   o que o buscador lê.

   O feedback não depende de cor: ao responder, todas as alternativas perdem a
   cor e só a correta continua acesa, com ✓; a escolhida errada ganha ✕, risco
   no texto e um tremor. Só depois disso o vermelho e o verde entram, no
   veredito — quando já não há alternativa colorida para confundir. */
(function () {
  var arena = document.querySelector('[data-arena]');
  var quizzes = Array.prototype.slice.call(document.querySelectorAll('.quiz'));
  if (!quizzes.length) return;

  var suave = !window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function festa(quiz) {
    if (!suave) return;
    var caixa = document.createElement('span');
    caixa.className = 'quiz__festa';
    var cores = ['#e21b3c', '#1368ce', '#d89e00', '#26890c', '#ffd84d'];
    for (var n = 0; n < 14; n++) {
      var c = document.createElement('i');
      c.className = 'quiz__confete';
      c.style.background = cores[n % cores.length];
      c.style.left = (10 + Math.random() * 80) + '%';
      c.style.top = (30 + Math.random() * 40) + '%';
      c.style.setProperty('--dx', (Math.random() * 200 - 100).toFixed(0) + 'px');
      c.style.setProperty('--dy', (-60 - Math.random() * 130).toFixed(0) + 'px');
      c.style.setProperty('--giro', (Math.random() * 540 - 270).toFixed(0) + 'deg');
      c.style.animationDelay = (Math.random() * 0.12).toFixed(2) + 's';
      caixa.appendChild(c);
    }
    quiz.appendChild(caixa);
    setTimeout(function () { caixa.remove(); }, 1100);
  }

  /* ------------------------------------------------ correção de uma questão */
  function prepara(quiz, aoResponder) {
    var correta = parseInt(quiz.dataset.correta, 10);
    var botoes = Array.prototype.slice.call(quiz.querySelectorAll('.quiz__opcao'));

    botoes.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (quiz.dataset.feito) return;
        quiz.dataset.feito = '1';
        var acertou = parseInt(btn.dataset.i, 10) === correta;
        quiz.dataset.acertou = acertou ? '1' : '0';

        botoes.forEach(function (b) {
          b.disabled = true;
          if (parseInt(b.dataset.i, 10) === correta) {
            b.classList.add('quiz__opcao--certa');
            var m = b.querySelector('.quiz__marca');
            if (m) m.textContent = '✓';
          }
        });
        if (!acertou) {
          btn.classList.add('quiz__opcao--errada');
          var mx = btn.querySelector('.quiz__marca');
          if (mx) mx.textContent = '✕';
        }
        quiz.classList.add('quiz--feito', acertou ? 'quiz--acertou' : 'quiz--errou');

        var vd = document.createElement('p');
        vd.className = 'quiz__veredito';
        vd.setAttribute('role', 'status');
        vd.textContent = acertou ? '✓  Acertou!' : '✕  Não foi dessa vez — a resposta certa está em destaque acima.';
        var exp = quiz.querySelector('.quiz__explica');
        if (exp) { quiz.insertBefore(vd, exp); exp.hidden = false; }
        else quiz.appendChild(vd);

        if (acertou) festa(quiz);
        if (aoResponder) aoResponder(acertou);
      });
    });
  }

  /* --------------------------------- mini-teste: sem player, só a correção */
  if (!arena) {
    quizzes.forEach(function (q) { prepara(q); });
    return;
  }

  /* ------------------------------------------------------------- o player */
  var total = quizzes.length;
  var hud = arena.querySelector('[data-hud]');
  var trilha = arena.querySelector('[data-trilha]');
  var fim = arena.querySelector('[data-fim]');
  var acertos = 0, seq = 0, erradas = [];

  arena.classList.add('arena--js');
  if (hud) hud.hidden = false;
  var elTotal = arena.querySelector('[data-total]');
  if (elTotal) elTotal.textContent = total;

  var pontos = [];
  quizzes.forEach(function () {
    var p = document.createElement('span');
    p.className = 'arena__ponto';
    trilha.appendChild(p);
    pontos.push(p);
  });

  function mostra(i) {
    quizzes.forEach(function (q, k) { q.classList.toggle('quiz--atual', k === i); });
    pontos.forEach(function (p, k) {
      p.classList.toggle('arena__ponto--atual',
        k === i && !/--ok|--erro/.test(p.className));
    });
    var el = arena.querySelector('[data-atual]');
    if (el) el.textContent = i + 1;
    quizzes[i].querySelectorAll('.quiz__opcao').forEach(function (b) {
      b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    });
  }

  function encerra() {
    quizzes.forEach(function (q) { q.classList.remove('quiz--atual'); });
    if (hud) hud.hidden = true;
    fim.hidden = false;

    var pct = Math.round((acertos / total) * 100);
    var elNota = arena.querySelector('[data-nota]');
    if (elNota) {
      var n = 0;
      elNota.textContent = '0';
      if (acertos && suave) {
        var passo = setInterval(function () {
          n++; elNota.textContent = n;
          if (n >= acertos) clearInterval(passo);
        }, Math.min(90, 700 / acertos));
      } else elNota.textContent = acertos;
    }
    setTimeout(function () {
      var b = arena.querySelector('[data-barra]');
      if (b) b.style.width = pct + '%';
    }, 60);

    var recado = arena.querySelector('[data-recado]');
    if (recado) {
      recado.textContent =
        pct === 100 ? 'Gabaritou! Pode seguir para o próximo tópico.' :
        pct >= 70 ? 'Bom resultado. Vale reler os pontos que escaparam.' :
        pct >= 40 ? 'Dá para melhorar: releia a explicação do tópico e refaça o teste.' :
        'Esse tópico ainda não está firme. Leia a explicação com calma e volte aqui.';
    }

    var rev = arena.querySelector('[data-revisao]');
    var lista = arena.querySelector('[data-revisao-lista]');
    if (rev && lista) {
      if (erradas.length) {
        lista.innerHTML = '';
        erradas.forEach(function (e) {
          var li = document.createElement('li');
          var b = document.createElement('b');
          b.textContent = e.pergunta;
          li.appendChild(b);
          li.appendChild(document.createElement('br'));
          li.appendChild(document.createTextNode('Resposta certa: '));
          var c = document.createElement('b');
          c.textContent = e.certa;
          li.appendChild(c);
          li.appendChild(document.createTextNode(' — ' + e.explica));
          lista.appendChild(li);
        });
        rev.hidden = false;
      } else rev.hidden = true;
    }
    fim.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'center' });
  }

  quizzes.forEach(function (quiz, idx) {
    var caixa = document.createElement('div');
    caixa.className = 'quiz__adiante';
    var proxima = document.createElement('button');
    proxima.type = 'button';
    proxima.className = 'btn';
    proxima.hidden = true;
    proxima.textContent = idx === total - 1 ? 'Ver resultado →' : 'Próxima →';
    caixa.appendChild(proxima);
    quiz.appendChild(caixa);

    prepara(quiz, function (acertou) {
      pontos[idx].classList.remove('arena__ponto--atual');
      pontos[idx].classList.add(acertou ? 'arena__ponto--ok' : 'arena__ponto--erro');

      if (acertou) {
        acertos++; seq++;
        var ac = arena.querySelector('[data-acertos]');
        if (ac) ac.textContent = acertos;
      } else {
        seq = 0;
        var certa = quiz.querySelectorAll('.quiz__opcao')[parseInt(quiz.dataset.correta, 10)];
        var pergunta = quiz.querySelector('.quiz__pergunta');
        var exp = quiz.querySelector('.quiz__explica');
        // O número da questão está escondido por CSS, mas continua no texto:
        // sem retirá-lo a lista de revisão vira "4 ___ you from Recife?".
        var limpa = '';
        if (pergunta) {
          var copia = pergunta.cloneNode(true);
          var n = copia.querySelector('.quiz__n');
          if (n) n.parentNode.removeChild(n);
          limpa = copia.textContent.trim();
        }
        erradas.push({
          pergunta: limpa,
          certa: certa ? certa.querySelector('.quiz__texto').textContent.trim() : '',
          explica: exp ? exp.textContent.trim() : ''
        });
      }

      var elSeq = arena.querySelector('[data-seq]');
      if (elSeq) {
        if (seq >= 2) {
          elSeq.hidden = false;
          var sn = arena.querySelector('[data-seq-n]');
          if (sn) sn.textContent = seq;
          elSeq.classList.add('arena__seq--on');
        } else {
          elSeq.classList.remove('arena__seq--on');
          elSeq.hidden = true;
        }
      }

      proxima.hidden = false;
      proxima.focus({ preventScroll: true });
    });

    proxima.addEventListener('click', function () {
      if (idx === total - 1) { encerra(); return; }
      mostra(idx + 1);
      arena.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' });
    });
  });

  var refazer = arena.querySelector('[data-refazer]');
  if (refazer) {
    refazer.addEventListener('click', function () {
      window.location.reload();
    });
  }

  mostra(0);
})();

/* Daqui para baixo segue o IIFE original do arquivo: mostrar/ocultar
   senha, filtro da lista e o resto. */
(function () {

  /* --------------------------------------------------- mostrar/ocultar senha
     Vale para todo campo de senha da página: entrar, cadastro e painel. O
     botão nasce aqui em vez de nas views para que nenhum formulário fique de
     fora, e é type="button" para não enviar o formulário sem querer. */
  var OLHO_ABERTO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
  var OLHO_FECHADO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-6.5 0-10-8-10-8a18.5 18.5 0 0 1 5.06-5.94"/>' +
    '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19"/>' +
    '<path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="m2 2 20 20"/></svg>';

  Array.prototype.forEach.call(document.querySelectorAll('input[type="password"]'), function (campo) {
    var caixa = document.createElement('div');
    caixa.className = 'campo-senha';
    campo.parentNode.insertBefore(caixa, campo);
    caixa.appendChild(campo);

    var botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'mostrar-senha';
    botao.innerHTML = OLHO_ABERTO;
    botao.setAttribute('aria-label', 'Mostrar senha');
    botao.setAttribute('aria-pressed', 'false');
    botao.title = 'Mostrar senha';
    caixa.appendChild(botao);

    botao.addEventListener('click', function () {
      var visivel = campo.type === 'text';
      campo.type = visivel ? 'password' : 'text';
      botao.innerHTML = visivel ? OLHO_ABERTO : OLHO_FECHADO;
      var rotulo = visivel ? 'Mostrar senha' : 'Ocultar senha';
      botao.setAttribute('aria-label', rotulo);
      botao.setAttribute('aria-pressed', visivel ? 'false' : 'true');
      botao.title = rotulo;
      // devolve o cursor ao fim do texto, senão ele salta para o começo
      campo.focus();
      var n = campo.value.length;
      try { campo.setSelectionRange(n, n); } catch (e) { /* alguns navegadores recusam */ }
    });
  });


  /* ------------------------------------------------------- relógio do simulado
     Conta desde a primeira resposta. O instante de início vem do servidor, no
     data-desde, para que mexer no relógio do aparelho não mude o que aparece.
     É só informativo: não há tempo limite. */
  var relogio = document.querySelector('.sim-relogio');
  if (relogio) {
    var desde = Date.parse(relogio.getAttribute('data-desde'));
    var saida = relogio.querySelector('span');
    if (!isNaN(desde) && saida) {
      var pinta = function () {
        var seg = Math.max(0, Math.floor((Date.now() - desde) / 1000));
        var h = Math.floor(seg / 3600);
        var m = Math.floor((seg % 3600) / 60);
        var s = seg % 60;
        var dois = function (n) { return (n < 10 ? '0' : '') + n; };
        saida.textContent = (h ? h + ':' + dois(m) : m) + ':' + dois(s);
      };
      pinta();
      setInterval(pinta, 1000);
    }
  }

})();

/* ------------------------------------------------ busca da gramática
   Os 60 tópicos já vêm no HTML — filtrar na hora é instantâneo e o servidor
   nem fica sabendo. O ?q= continua valendo para quem chega por link ou está
   sem JS: o servidor marca os que não casam com `hidden`, que o navegador
   respeita sozinho, e como nenhum tópico é omitido, apagar o campo devolve
   os 60 sem recarregar.                                                  */
(function () {
  'use strict';
  var form = document.querySelector('.gram-busca');
  if (!form) return;
  var campo = form.querySelector('input[name="q"]');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.grade--gram .gcard'));
  if (!campo || !cards.length) return;

  var blocos = Array.prototype.slice.call(document.querySelectorAll('.nivel-bloco'));
  var contador = form.querySelector('.gram-busca__n strong');
  var rotulo = form.querySelector('.gram-busca__rot');
  var todos = form.querySelector('.gram-busca__todos');
  var botao = form.querySelector('button[type="submit"]');
  var vazio = document.querySelector('.gram-vazio');
  var vazioTermo = document.querySelector('.gram-vazio__termo');

  // mesma normalização de src/lib/gramatica.js: sem acento, sem pontuação
  function normalizar(s) {
    return String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function filtrar() {
    var termo = campo.value.trim();
    var palavras = normalizar(termo).split(' ').filter(Boolean);
    var achados = 0;

    cards.forEach(function (card) {
      var alvo = card.getAttribute('data-busca') || '';
      var casa = palavras.every(function (p) { return alvo.indexOf(p) !== -1; });
      card.hidden = !casa;
      if (casa) achados++;
    });

    // um nível sem nenhum tópico visível não precisa do próprio cabeçalho,
    // nem da pastilha que salta para ele
    blocos.forEach(function (b) {
      var visiveis = b.querySelectorAll('.gcard:not([hidden])').length;
      b.hidden = !visiveis;
      var pill = document.querySelector('.niveis-nav a[href="#' + b.id + '"]');
      if (pill) {
        pill.hidden = !visiveis;
        var n = pill.querySelector('.niveis-nav__n');
        var r = pill.querySelector('.niveis-nav__rot');
        if (n) n.textContent = visiveis;
        if (r) r.textContent = visiveis === 1 ? 'tópico' : 'tópicos';
      }
    });

    if (contador) contador.textContent = achados;
    if (rotulo) rotulo.textContent = achados === 1 ? 'tópico' : 'tópicos';
    if (todos) todos.hidden = !palavras.length;
    if (vazioTermo) vazioTermo.textContent = termo;
    if (vazio) vazio.hidden = achados > 0;
  }

  // com JS o botão vira decoração: o resultado apareceu enquanto se digitava
  if (botao) botao.hidden = true;
  form.addEventListener('submit', function (ev) { ev.preventDefault(); campo.blur(); });
  campo.addEventListener('input', filtrar);
  campo.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && campo.value) { campo.value = ''; filtrar(); }
  });

  // "/" foca a busca, como em toda ferramenta de busca decente
  document.addEventListener('keydown', function (ev) {
    var alvo = document.activeElement;
    var digitando = alvo && (/^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName) || alvo.isContentEditable);
    if (ev.key === '/' && !digitando && !ev.ctrlKey && !ev.metaKey) {
      ev.preventDefault();
      campo.focus();
      campo.select();
    }
  });

  // chegou por link com ?q=: reaplica no cliente para o contador e os
  // cabeçalhos ficarem coerentes com o que o servidor já escondeu
  if (campo.value.trim()) filtrar();
})();
