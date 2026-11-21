/* Calculadora de receta — compartida por Panadería, Pastelería y Cocina.
   Uso: en el detalle de receta, ${calcRecetaHTML(receta, '#color')}
   Escala los ingredientes según la cantidad que se quiere sacar. */
(function () {
  var PESO = { kg: 1000, kgs: 1000, kilo: 1000, kilos: 1000, g: 1, gr: 1, grs: 1, gm: 1, gms: 1, grm: 1, gramo: 1, gramos: 1 };
  var VOL = { l: 1000, lt: 1000, lts: 1000, litro: 1000, litros: 1000, ml: 1, cc: 1, cm3: 1 };
  var MEDIDA = { u: 'u', un: 'u', unid: 'u', unidad: 'u', unidades: 'u', cda: 'cda', cdas: 'cdas', cucharada: 'cda', cucharadas: 'cdas',
    cdita: 'cdita', cditas: 'cditas', cucharadita: 'cdita', cucharaditas: 'cditas', taza: 'taza', tazas: 'tazas', pizca: 'pizca', pizcas: 'pizcas',
    sobre: 'sobre', sobres: 'sobres', paquete: 'paquete', paquetes: 'paquetes', lata: 'lata', latas: 'latas', planchas: 'planchas', plancha: 'plancha' };
  var FR = { '½': 0.5, '¼': 0.25, '¾': 0.75 };
  var EST = {};

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(s) {
    s = String(s).trim();
    if (FR[s] != null) return FR[s];
    var m = s.match(/^(\d+)\s*\/\s*(\d+)$/); if (m) return +m[1] / +m[2];
    s = s.replace(/\.(?=\d{3}(?!\d))/g, '').replace(',', '.');
    return parseFloat(s);
  }
  function txt(ing) { return typeof ing === 'string' ? ing : (ing && (ing.texto || ing.text || ing.nombre)) || ''; }

  // "2800g harina" · "1,5 kg azúcar" · "3 huevos" · "2 cdas de miel" · "harina 500g" · "Ralladura de limón"
  function parseIng(ing) {
    var t = txt(ing).trim();
    var m = t.match(/^\s*(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?|[½¼¾])\s*([a-zA-ZáéíóúÁÉÍÓÚñ]+\d?)?\.?\s*(.*)$/);
    if (m) {
      var q = num(m[1]), u = (m[2] || '').toLowerCase(), rest = (m[3] || '').replace(/^de\s+/i, '');
      if (PESO[u]) return { q: q * PESO[u], dim: 'g', rest: rest, t: t };
      if (VOL[u]) return { q: q * VOL[u], dim: 'ml', rest: rest, t: t };
      if (MEDIDA[u]) return { q: q, dim: 'u', med: u, rest: rest, t: t };
      return { q: q, dim: 'u', med: '', rest: ((m[2] || '') + ' ' + (m[3] || '')).trim(), t: t };
    }
    var m2 = t.match(/(\d+(?:[.,]\d+)?)\s*(kg|kgs|g|gr|grs|gm|gms|ml|cc|l|lt|lts)\b\.?/i);
    if (m2) {
      var u2 = m2[2].toLowerCase(), q2 = num(m2[1]);
      var rest2 = (t.slice(0, m2.index) + ' ' + t.slice(m2.index + m2[0].length)).replace(/\s+/g, ' ').trim();
      if (PESO[u2]) return { q: q2 * PESO[u2], dim: 'g', rest: rest2, t: t };
      return { q: q2 * VOL[u2], dim: 'ml', rest: rest2, t: t };
    }
    return { q: null, t: t };
  }

  function fmtN(x, dec) { return x.toLocaleString('es-AR', { maximumFractionDigits: dec, minimumFractionDigits: 0 }); }
  function fmtQ(p, f) {
    var x = p.q * f;
    if (p.dim === 'g') return x >= 1000 ? fmtN(x / 1000, 2) + ' kg' : fmtN(x, x < 10 ? 1 : 0) + ' g';
    if (p.dim === 'ml') return x >= 1000 ? fmtN(x / 1000, 2) + ' l' : fmtN(x, x < 10 ? 1 : 0) + ' ml';
    var s = fmtN(x, 1);
    if (!p.med && Math.abs(x - Math.round(x)) > 0.05) s += ' (≈ ' + fmtN(Math.max(1, Math.round(x)), 0) + ')';
    return s + (p.med ? ' ' + MEDIDA[p.med] : '');
  }

  // Opciones de "qué quiero sacar" según el rinde escrito en la receta
  function opciones(r, ps) {
    var ops = [], rin = String(r.rendimiento || '').split(/—|\(|·|\bcada\b/)[0];
    rin.split(/\/|\so\s/).forEach(function (pz) {
      var m = pz.match(/^\s*(\d+(?:[.,]\d+)?)(?:\s*(?:a|-)\s*\d+(?:[.,]\d+)?)?\s*(kg|kgs|kilos?|g|gr|grs|gm|gms|gramos)?\b\.?\s*(.*)$/i);
      if (!m) return;
      var n = num(m[1]); if (!(n > 0)) return;
      var u = (m[2] || '').toLowerCase(), etq = (m[3] || '').replace(/\s+de\s+\d.*$/i, '').replace(/c\/u.*$/i, '').trim();
      if (PESO[u]) ops.push({ k: 'peso', base: n * PESO[u], etq: 'kg' + (etq ? ' (' + etq + ')' : ''), def: n * PESO[u] / 1000 });
      else if (etq || ops.length === 0) ops.push({ k: 'u', base: n, etq: etq || 'unidades', def: n });
    });
    var tot = ps.reduce(function (a, p) { return a + (p.q != null && p.dim !== 'u' ? p.q : 0); }, 0);
    if (tot > 0) ops.push({ k: 'masa', base: tot, etq: 'kg de masa total', def: Math.round(tot / 10) / 100 });
    ops.push({ k: 'tanda', base: 1, etq: 'tandas (veces la receta)', def: 1 });
    return ops;
  }

  window.calcRecetaHTML = function (r, color) {
    if (!r || !r.ingredients || !r.ingredients.length) return '';
    var id = 'calc_' + String(r.id).replace(/\W/g, '');
    var ps = r.ingredients.map(parseIng), ops = opciones(r, ps);
    EST[id] = { ps: ps, ops: ops, color: color || '#534AB7' };
    var c = EST[id].color;
    return '<details id="' + id + '" style="margin:14px 0 6px;border:1.5px solid ' + c + ';border-radius:10px;background:#fff;font-family:system-ui,sans-serif">' +
      '<summary style="cursor:pointer;padding:10px 12px;font-size:14px;font-weight:700;color:' + c + ';list-style:none">🧮 Calculadora de la receta <span style="font-weight:400;font-size:12px;color:#888">· ¿cuánto querés sacar?</span></summary>' +
      '<div style="padding:0 12px 12px">' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0 6px"><span style="font-size:14px;color:#333">Quiero hacer</span>' +
      '<input id="' + id + '_q" type="number" inputmode="decimal" min="0" step="any" value="' + ops[0].def + '" oninput="calcRecetaUpd(\'' + id + '\')" style="width:90px;padding:8px;font-size:16px;border:1px solid #ccc;border-radius:8px">' +
      '<select id="' + id + '_o" onchange="calcRecetaOp(\'' + id + '\')" style="padding:8px;font-size:14px;border:1px solid #ccc;border-radius:8px;max-width:100%">' +
      ops.map(function (o, i) { return '<option value="' + i + '">' + esc(o.etq) + '</option>'; }).join('') + '</select></div>' +
      '<div id="' + id + '_f" style="font-size:12px;color:#777;margin-bottom:8px"></div>' +
      '<div id="' + id + '_l"></div>' +
      '<div style="font-size:11px;color:#999;margin-top:8px">Se calcula con lo que dice "Rinde" en la receta' + (r.rendimiento ? ' (' + esc(r.rendimiento) + ')' : '') + '. Si el rinde es en crudo y lo que querés es cocido, sumale la merma del horno.</div>' +
      '</div></details>';
  };

  window.calcRecetaOp = function (id) {
    var E = EST[id]; if (!E) return;
    var o = E.ops[+document.getElementById(id + '_o').value];
    document.getElementById(id + '_q').value = o.def;
    calcRecetaUpd(id);
  };

  window.calcRecetaUpd = function (id) {
    var E = EST[id]; if (!E) return;
    var o = E.ops[+document.getElementById(id + '_o').value];
    var q = num(document.getElementById(id + '_q').value || '0') || 0;
    var f = o.k === 'tanda' ? q : (o.k === 'u' ? q / o.base : q * 1000 / o.base);
    var rinde = o.k === 'tanda' ? '' : ' · la receta base rinde ' + (o.k === 'u' ? fmtN(o.base, 1) + ' ' + o.etq : fmtN(o.base / 1000, 2) + ' ' + o.etq);
    document.getElementById(id + '_f').textContent = 'Multiplicás la receta × ' + fmtN(f, 2) + rinde;
    document.getElementById(id + '_l').innerHTML = E.ps.map(function (p) {
      var cant = p.q == null ? '<span style="color:#999">a ojo, proporcional</span>' : '<b style="color:' + E.color + '">' + esc(fmtQ(p, f)) + '</b>';
      var nom = p.q == null ? p.t : (p.rest || p.t);
      return '<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dashed #eee;font-size:14px">' +
        '<span style="color:#333">' + esc(nom) + '</span><span style="white-space:nowrap;text-align:right">' + cant + '</span></div>';
    }).join('');
  };

  // Calcula apenas se abre el desplegable
  document.addEventListener('toggle', function (e) {
    var t = e.target; if (t && t.id && EST[t.id] && t.open) calcRecetaUpd(t.id);
  }, true);
})();
