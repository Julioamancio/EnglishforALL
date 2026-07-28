/**
 * Montador de provas: mantém a seleção ao filtrar e ao paginar.
 *
 * O formulário só envia os checkboxes da página atual, então guardamos os ids
 * escolhidos em sessionStorage e reinjetamos os que não estão visíveis como
 * campos hidden na hora de enviar. Sem isso, filtrar apagaria a seleção.
 *
 * A página funciona sem este script: quem estiver sem JavaScript ainda consegue
 * marcar e gerar a prova da página que está vendo.
 */
(function () {
  var CHAVE = 'prova:selecao';
  var form = document.getElementById('formProva');
  if (!form) return;

  var caixa = document.getElementById('selecionadas');
  var barra = document.getElementById('barraProva');
  var contador = document.getElementById('contador');
  var limpar = document.getElementById('limparSel');

  function ler() {
    try {
      var bruto = sessionStorage.getItem(CHAVE);
      return bruto ? JSON.parse(bruto) : {};
    } catch (e) {
      return {};
    }
  }

  function gravar(sel) {
    try {
      sessionStorage.setItem(CHAVE, JSON.stringify(sel));
    } catch (e) {
      /* modo privado ou storage cheio: a seleção vale só para esta página */
    }
  }

  var selecao = ler();

  function caixas() {
    return form.querySelectorAll('input[name="questoes"]');
  }

  function pintar() {
    var n = Object.keys(selecao).length;
    contador.textContent = n + (n === 1 ? ' questão selecionada' : ' questões selecionadas');
    barra.hidden = n === 0;
    limpar.hidden = n === 0;

    // Ids que não estão nesta página viajam como hidden.
    caixa.innerHTML = '';
    var visiveis = {};
    caixas().forEach(function (c) {
      visiveis[c.value] = true;
    });
    Object.keys(selecao).forEach(function (id) {
      if (visiveis[id]) return;
      var h = document.createElement('input');
      h.type = 'hidden';
      h.name = 'questoes';
      h.value = id;
      caixa.appendChild(h);
    });
  }

  caixas().forEach(function (c) {
    if (selecao[c.value]) c.checked = true;
    c.addEventListener('change', function () {
      if (c.checked) selecao[c.value] = c.dataset.titulo || '1';
      else delete selecao[c.value];
      gravar(selecao);
      pintar();
    });
  });

  document.querySelectorAll('[data-marcar]').forEach(function (b) {
    b.addEventListener('click', function () {
      var ligar = b.dataset.marcar === 'todas';
      caixas().forEach(function (c) {
        c.checked = ligar;
        if (ligar) selecao[c.value] = c.dataset.titulo || '1';
        else delete selecao[c.value];
      });
      gravar(selecao);
      pintar();
    });
  });

  limpar.addEventListener('click', function () {
    selecao = {};
    gravar(selecao);
    caixas().forEach(function (c) {
      c.checked = false;
    });
    pintar();
  });

  // Prova gerada: a seleção já cumpriu seu papel.
  form.addEventListener('submit', function () {
    setTimeout(function () {
      sessionStorage.removeItem(CHAVE);
    }, 1200);
  });

  pintar();
})();
