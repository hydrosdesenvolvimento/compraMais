/* Landing pública do Compra Mais: consome GET /transparencia (mesmo host, via proxy do nginx) e
   preenche os indicadores. CTAs fazem deep-link para a aplicação (base em body[data-app-base]). */
(function () {
  'use strict';

  var APP_BASE = (document.body.getAttribute('data-app-base') || '').replace(/\/$/, '');
  var fmtInt = new Intl.NumberFormat('pt-BR');
  var fmtMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  /** Valor monetário compacto para os destaques (ex.: R$ 2,84M / R$ 680k / R$ 420). */
  function moedaCompacta(n) {
    if (n >= 1e6) return 'R$ ' + (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + 'M';
    if (n >= 1e3) return 'R$ ' + Math.round(n / 1e3).toLocaleString('pt-BR') + 'k';
    return fmtMoeda.format(n || 0);
  }

  function slot(nome) { return document.querySelector('[data-fill="' + nome + '"]'); }
  function setText(nome, valor) { var el = slot(nome); if (el) el.textContent = valor; }

  /** Renderiza uma lista de barras (rótulo, valor exibido, fração 0..1). */
  function renderBars(nome, itens, classe) {
    var el = slot(nome);
    if (!el) return;
    if (!itens.length) { el.innerHTML = '<li class="muted" style="text-align:left;padding:6px 0">Sem dados no período.</li>'; return; }
    var max = Math.max.apply(null, itens.map(function (i) { return i.fracao; }).concat(0.0001));
    el.innerHTML = itens.map(function (i) {
      var pct = Math.round((i.fracao / max) * 100);
      return '<li class="bar-row">' +
        '<div class="bar-top"><span class="k">' + escapeHtml(i.rotulo) + '</span><span class="v">' + escapeHtml(i.valor) + '</span></div>' +
        '<div class="bar-track"><div class="bar-fill' + (classe || '') + '" style="width:' + pct + '%"></div></div>' +
        '</li>';
    }).join('');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /** Aponta os CTAs (data-app-link) para a aplicação. */
  function wireAppLinks() {
    var links = document.querySelectorAll('[data-app-link]');
    for (var i = 0; i < links.length; i++) {
      links[i].setAttribute('href', APP_BASE + links[i].getAttribute('data-app-link'));
    }
  }

  function preencher(d) {
    // Destaques do hero + painel + métricas
    setText('investimentoTotalCompacto', moedaCompacta(d.investimentoTotal));
    setText('investimentoTotal', fmtMoeda.format(d.investimentoTotal || 0));
    setText('investimentoTotalTag', moedaCompacta(d.investimentoTotal) + ' total');
    setText('fornecedoresAtivos', fmtInt.format(d.fornecedoresAtivos || 0));
    setText('fornecedoresAtivosTag', fmtInt.format(d.fornecedoresAtivos || 0));
    setText('empresasCredenciadas', fmtInt.format(d.empresasCredenciadas || 0));
    setText('editaisVigentes', fmtInt.format(d.editaisVigentes || 0));
    setText('meiPercentual', (d.meiPercentual || 0) + '%');

    // Investimento por secretaria (painel do hero — top 3 — e card completo)
    var porSec = (d.investimentoPorSecretaria || []).map(function (s) {
      return { rotulo: s.secretaria, valor: fmtMoeda.format(s.valor), fracao: s.valor };
    });
    renderBars('investimentoPorSecretariaMini', porSec.slice(0, 3), '');
    renderBars('investimentoPorSecretaria', porSec, '');

    // Participação por porte (fração pela contagem)
    var totalPorte = (d.participacaoPorPorte || []).reduce(function (a, p) { return a + p.fornecedores; }, 0) || 1;
    var porPorte = (d.participacaoPorPorte || []).map(function (p) {
      var pct = Math.round((p.fornecedores / totalPorte) * 100);
      return { rotulo: p.porte + ' · ' + pct + '%', valor: fmtInt.format(p.fornecedores) + ' empresas', fracao: p.fornecedores };
    });
    renderBars('participacaoPorPorte', porPorte, '');

    // Editais públicos
    var tbody = slot('editaisPublicos');
    if (tbody) {
      var editais = d.editaisPublicos || [];
      tbody.innerHTML = editais.length
        ? editais.map(function (e) {
            return '<tr>' +
              '<td class="num">' + escapeHtml(e.numero) + '</td>' +
              '<td>' + escapeHtml(e.objeto) + '</td>' +
              '<td>' + escapeHtml(e.secretaria) + '</td>' +
              '<td class="right valor">' + fmtMoeda.format(e.valorEstimado || 0) + '</td>' +
              '</tr>';
          }).join('')
        : '<tr><td colspan="4" class="muted">Nenhum edital publicado no momento.</td></tr>';
    }
  }

  wireAppLinks();

  fetch('/transparencia', { headers: { accept: 'application/json' } })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(preencher)
    .catch(function (err) {
      console.error('[portal] falha ao carregar /transparencia:', err);
      var tbody = slot('editaisPublicos');
      if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="muted">Não foi possível carregar os dados agora.</td></tr>';
    });
})();
