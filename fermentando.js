/* Masas fermentando — seguimiento con código por bolsa (Panadería / Madrugada).
   - Ferm.elegir(receta, rendimiento, alStock): al completar una tanda pregunta si va a stock o a fermentar.
   - Ferm.ingresar(receta, rendimiento): pone masas a fermentar (cámara o panadería) y genera un código por bolsa.
   - Botón flotante "🫧 Fermentando" con la lista de todas las masas, cuándo entró cada una y acciones. */
(function () {
  var URL_ = 'https://sinoeoaktirnscdpbvdc.supabase.co/rest/v1/';
  function KEY() { /* eslint-disable-next-line no-undef */ return (typeof SUPABASE_KEY !== 'undefined' && SUPABASE_KEY) || window.SUPABASE_KEY || ''; }
  function hdr() { return { apikey: KEY(), Authorization: 'Bearer ' + KEY(), 'Content-Type': 'application/json' }; }
  async function rpc(fn, p) {
    var r = await fetch(URL_ + 'rpc/' + fn, { method: 'POST', headers: hdr(), body: JSON.stringify({ p: p }) });
    var t = await r.text(); var j = t ? JSON.parse(t) : null;
    if (!r.ok) throw new Error((j && (j.message || j.hint)) || 'No se pudo guardar');
    return j;
  }
  async function lista() {
    var r = await fetch(URL_ + 'masas_fermentando?estado=eq.fermentando&order=ingreso_at.asc', { headers: hdr() });
    if (!r.ok) throw new Error('No se pudo leer la lista');
    return r.json();
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var UB = { camara: '❄️ Cámara', panaderia: '🥖 Panadería' };
  var DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  function fecha(iso) { var d = new Date(iso); return DIAS[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function hace(iso) {
    var m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
    if (m < 60) return m + ' min'; var h = Math.floor(m / 60);
    if (h < 24) return h + ' h ' + (m % 60 ? (m % 60) + ' min' : '');
    return Math.floor(h / 24) + ' día' + (h >= 48 ? 's' : '') + (h % 24 ? ' ' + (h % 24) + ' h' : '');
  }
  function horas(iso) { return (Date.now() - new Date(iso)) / 3600000; }

  var css = document.createElement('style');
  css.textContent = '#fermBtn{position:fixed;left:12px;bottom:84px;z-index:900;background:#534AB7;color:#fff;border:none;border-radius:24px;padding:10px 16px;font:600 14px system-ui,sans-serif;box-shadow:0 3px 12px rgba(0,0,0,.25);cursor:pointer}' +
    '.fermOv{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:flex-end;justify-content:center;font-family:system-ui,sans-serif}' +
    '.fermBox{background:#fff;color:#222;width:100%;max-width:560px;max-height:92vh;overflow:auto;border-radius:16px 16px 0 0;padding:16px}' +
    '.fermBox h3{margin:0 0 10px;font-size:17px}.fermBox label{display:block;font-size:13px;color:#555;margin:10px 0 4px}' +
    '.fermBox input,.fermBox textarea{width:100%;box-sizing:border-box;padding:10px;font-size:16px;border:1px solid #ccc;border-radius:8px}' +
    '.fermSeg{display:flex;gap:8px}.fermSeg button{flex:1;padding:12px;border:2px solid #ddd;background:#fff;border-radius:10px;font-size:15px;cursor:pointer}.fermSeg button.on{border-color:#534AB7;background:#EEEDFE;font-weight:700}' +
    '.fermOk{width:100%;margin-top:14px;padding:13px;border:none;border-radius:10px;background:#534AB7;color:#fff;font-size:16px;font-weight:700;cursor:pointer}' +
    '.fermSec{width:100%;margin-top:8px;padding:11px;border:1px solid #ccc;border-radius:10px;background:#fff;font-size:15px;cursor:pointer}' +
    '.fermCard{border:1px solid #e3e3e3;border-radius:10px;padding:10px 12px;margin:8px 0}.fermCard.v1{border-left:5px solid #f59e0b}.fermCard.v2{border-left:5px solid #dc2626}' +
    '.fermCod{font:800 18px ui-monospace,monospace;letter-spacing:1px}.fermAcc{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}.fermAcc button{padding:7px 10px;border:1px solid #ccc;background:#fff;border-radius:8px;font-size:13px;cursor:pointer}' +
    '.fermChip{display:inline-block;font-size:12px;padding:2px 8px;border-radius:12px;background:#f1f1f1;margin-left:6px}';
  document.head.appendChild(css);

  function modal(html) {
    cerrar();
    var o = document.createElement('div'); o.className = 'fermOv'; o.id = 'fermOv';
    o.innerHTML = '<div class="fermBox">' + html + '</div>';
    o.addEventListener('click', function (e) { if (e.target === o) cerrar(); });
    document.body.appendChild(o); return o;
  }
  function cerrar() { var o = document.getElementById('fermOv'); if (o) o.remove(); }

  // ── Al completar una tanda: ¿stock o fermentar?
  function elegir(receta, rendimiento, alStock) {
    modal('<h3>✅ ' + esc(receta) + '</h3><p style="margin:0 0 6px;color:#666;font-size:14px">¿Qué hacés con esta tanda?</p>' +
      '<button class="fermOk" id="fermA">🫧 Poner a fermentar</button>' +
      '<button class="fermSec" id="fermB">📦 Ya está lista (va a stock, como siempre)</button>' +
      '<button class="fermSec" id="fermC" style="border:none;color:#888">Cancelar</button>');
    document.getElementById('fermA').onclick = function () { ingresar(receta, rendimiento); };
    document.getElementById('fermB').onclick = function () { cerrar(); if (alStock) alStock(); };
    document.getElementById('fermC').onclick = cerrar;
  }

  // ── Poner masas a fermentar
  function ingresar(receta, rendimiento) {
    var ub = 'camara';
    modal('<h3>🫧 A fermentar: ' + esc(receta) + '</h3>' +
      '<label>¿Dónde queda?</label><div class="fermSeg"><button id="fUbC" class="on">❄️ Cámara</button><button id="fUbP">🥖 Panadería</button></div>' +
      '<label>¿Cuántas masas / bolsas? (cada una lleva su código)</label><input id="fCant" type="number" inputmode="numeric" min="1" max="60" value="1">' +
      '<label>¿Qué tiene cada bolsa? (opcional)</label><input id="fCont" placeholder="' + esc(rendimiento ? 'ej: ' + String(rendimiento).split('—')[0].trim() : 'ej: 8 kg, 10 panes, 1 tanda') + '">' +
      '<label>Nota (opcional)</label><input id="fNota" placeholder="ej: para el pedido de mañana, hornear el martes">' +
      '<button class="fermOk" id="fOk">🫧 Poner a fermentar</button><button class="fermSec" id="fNo">Cancelar</button>');
    var bc = document.getElementById('fUbC'), bp = document.getElementById('fUbP');
    bc.onclick = function () { ub = 'camara'; bc.classList.add('on'); bp.classList.remove('on'); };
    bp.onclick = function () { ub = 'panaderia'; bp.classList.add('on'); bc.classList.remove('on'); };
    document.getElementById('fNo').onclick = cerrar;
    document.getElementById('fOk').onclick = async function () {
      var b = this; b.disabled = true; b.textContent = 'Guardando…';
      try {
        var rows = await rpc('masa_ingresar', { receta: receta, ubicacion: ub, cantidad: +document.getElementById('fCant').value || 1,
          contenido: document.getElementById('fCont').value, notas: document.getElementById('fNota').value, sector: 'panaderia' });
        if (window.addToLog) try { addToLog('🫧 A fermentar (' + (UB[ub] || ub) + '): ' + receta + ' · ' + rows.map(function (r) { return r.codigo; }).join(', '), 'receta'); } catch (e) {}
        listo(rows);
        contar();
      } catch (e) { b.disabled = false; b.textContent = '🫧 Poner a fermentar'; alert(e.message); }
    };
  }

  function listo(rows) {
    modal('<h3>🫧 Fermentando</h3><p style="margin:0 0 8px;color:#555;font-size:14px">Pegale a cada bolsa su etiqueta:</p>' +
      rows.map(function (r) { return '<div class="fermCard"><span class="fermCod">' + esc(r.codigo) + '</span><span class="fermChip">' + (UB[r.ubicacion] || '') + '</span><div style="font-size:13px;color:#666">' + esc(r.receta) + (r.de_bolsas > 1 ? ' · bolsa ' + r.bolsa + ' de ' + r.de_bolsas : '') + '</div></div>'; }).join('') +
      '<button class="fermOk" id="fPr">🖨 Imprimir etiquetas</button><button class="fermSec" id="fPrA4">🖨 Imprimir en hoja A4 (para recortar)</button><button class="fermSec" id="fFin">Listo</button>');
    document.getElementById('fPr').onclick = function () { imprimir(rows, false); };
    document.getElementById('fPrA4').onclick = function () { imprimir(rows, true); };
    document.getElementById('fFin').onclick = cerrar;
  }

  // ── Etiquetas: una por página (etiquetadora 60×40 mm) o grilla en A4
  function imprimir(rows, a4) {
    var w = window.open('', '_blank'); if (!w) { alert('Habilitá las ventanas emergentes para imprimir'); return; }
    var et = rows.map(function (r) {
      return '<div class="et"><div class="t">POLY · MASA EN FERMENTACIÓN</div><div class="c">' + esc(r.codigo) + '</div>' +
        '<div class="r">' + esc(r.receta) + '</div>' + (r.contenido ? '<div class="s">' + esc(r.contenido) + '</div>' : '') +
        '<div class="s">Entró: <b>' + fecha(r.ingreso_at) + '</b> · ' + (r.ubicacion === 'camara' ? 'Cámara' : 'Panadería') + '</div>' +
        '<div class="s">' + (r.de_bolsas > 1 ? 'Bolsa ' + r.bolsa + ' de ' + r.de_bolsas + ' · ' : '') + (r.ingreso_por ? esc(r.ingreso_por) : '') + '</div></div>';
    }).join('');
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Etiquetas masas</title><style>' +
      (a4 ? '@page{size:A4;margin:8mm}body{display:flex;flex-wrap:wrap;gap:3mm}.et{width:60mm;height:40mm;border:1px dashed #999}'
          : '@page{size:60mm 40mm;margin:0}.et{width:60mm;height:40mm;page-break-after:always}') +
      'body{margin:0;font-family:Arial,sans-serif}.et{box-sizing:border-box;padding:2.5mm 3mm;overflow:hidden}.t{font-size:7pt;letter-spacing:.5px;color:#333}' +
      '.c{font:900 20pt Arial,sans-serif;letter-spacing:1px;margin:1mm 0}.r{font-size:10pt;font-weight:700;line-height:1.1}.s{font-size:7.5pt;margin-top:.6mm}</style></head><body>' + et +
      '<script>setTimeout(function(){window.print()},300)<\/script></body></html>');
    w.document.close();
  }

  // ── Panel con todas las masas
  var FILTRO = 'todas';
  async function panel() {
    var o = modal('<h3>🫧 Masas fermentando</h3><div class="fermSeg" style="margin-bottom:8px"><button data-f="todas">Todas</button><button data-f="camara">❄️ Cámara</button><button data-f="panaderia">🥖 Panadería</button></div>' +
      '<input id="fBus" placeholder="Buscar por código o masa…" style="margin-bottom:4px"><div id="fLis"><p style="color:#888">Cargando…</p></div><button class="fermSec" id="fCer">Cerrar</button>');
    document.getElementById('fCer').onclick = cerrar;
    var data = [];
    function pintar() {
      o.querySelectorAll('[data-f]').forEach(function (b) { b.classList.toggle('on', b.dataset.f === FILTRO); });
      var q = (document.getElementById('fBus').value || '').toLowerCase();
      var L = data.filter(function (r) { return (FILTRO === 'todas' || r.ubicacion === FILTRO) && (!q || (r.codigo + ' ' + r.receta).toLowerCase().indexOf(q) >= 0); });
      var porRec = {}; L.forEach(function (r) { porRec[r.receta] = (porRec[r.receta] || 0) + 1; });
      document.getElementById('fLis').innerHTML = (L.length ? '<p style="font-size:13px;color:#555;margin:6px 0">' + L.length + ' masa' + (L.length > 1 ? 's' : '') + ': ' +
        Object.keys(porRec).map(function (k) { return esc(k) + ' ×' + porRec[k]; }).join(' · ') + '</p>' : '<p style="color:#888">No hay masas fermentando' + (FILTRO !== 'todas' ? ' acá' : '') + '.</p>') +
        L.map(function (r) {
          var h = horas(r.ingreso_at);
          return '<div class="fermCard ' + (h >= 48 ? 'v2' : h >= 24 ? 'v1' : '') + '"><span class="fermCod">' + esc(r.codigo) + '</span><span class="fermChip">' + (UB[r.ubicacion] || '') + '</span>' +
            '<div style="font-weight:600;margin-top:2px">' + esc(r.receta) + (r.contenido ? ' <span style="font-weight:400;color:#666">· ' + esc(r.contenido) + '</span>' : '') + '</div>' +
            '<div style="font-size:13px;color:#555">Entró ' + fecha(r.ingreso_at) + ' · hace <b>' + hace(r.ingreso_at) + '</b>' + (r.ingreso_por ? ' · ' + esc(r.ingreso_por) : '') + '</div>' +
            (r.notas ? '<div style="font-size:13px;color:#7a5b00">📝 ' + esc(r.notas) + '</div>' : '') +
            '<div class="fermAcc"><button data-a="usada" data-id="' + r.id + '">✅ Sacar para usar/hornear</button><button data-a="mover" data-id="' + r.id + '">↔ Pasar a ' + (r.ubicacion === 'camara' ? 'Panadería' : 'Cámara') + '</button>' +
            '<button data-a="print" data-id="' + r.id + '">🖨 Etiqueta</button><button data-a="descartada" data-id="' + r.id + '" style="color:#b91c1c">🗑 Descartar</button></div></div>';
        }).join('');
    }
    o.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { FILTRO = b.dataset.f; pintar(); }; });
    document.getElementById('fBus').oninput = pintar;
    document.getElementById('fLis').onclick = async function (e) {
      var b = e.target.closest('button[data-a]'); if (!b) return;
      var r = data.find(function (x) { return String(x.id) === b.dataset.id; }); if (!r) return;
      var a = b.dataset.a;
      if (a === 'print') return imprimir([r], false);
      var p = { id: r.id, accion: a };
      if (a === 'mover') p.ubicacion = r.ubicacion === 'camara' ? 'panaderia' : 'camara';
      if (a === 'descartada') { var n = prompt('¿Por qué se descarta ' + r.codigo + '? (opcional)'); if (n === null) return; p.nota = n; }
      if (a === 'usada' && !confirm('¿Sacar ' + r.codigo + ' (' + r.receta + ') de fermentación?')) return;
      b.disabled = true;
      try { await rpc('masa_actualizar', p); if (window.addToLog) try { addToLog((a === 'usada' ? '✅ Sacó de fermentación: ' : a === 'mover' ? '↔ Movió masa: ' : '🗑 Descartó masa: ') + r.codigo + ' · ' + r.receta, 'receta'); } catch (e2) {}
        data = await lista(); pintar(); contar(data); }
      catch (err) { b.disabled = false; alert(err.message); }
    };
    try { data = await lista(); pintar(); contar(data); } catch (e) { document.getElementById('fLis').innerHTML = '<p style="color:#b91c1c">' + esc(e.message) + '</p>'; }
  }

  // ── Botón flotante con la cantidad
  var btn = document.createElement('button'); btn.id = 'fermBtn'; btn.textContent = '🫧 Fermentando'; btn.onclick = panel;
  function poner() { if (document.body && !document.getElementById('fermBtn')) document.body.appendChild(btn); }
  async function contar(d) {
    try { d = d || await lista(); btn.textContent = '🫧 Fermentando' + (d.length ? ' · ' + d.length : ''); var viejas = d.filter(function (r) { return horas(r.ingreso_at) >= 48; }).length; btn.style.background = viejas ? '#dc2626' : '#534AB7'; } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { poner(); contar(); }); else { poner(); setTimeout(contar, 1500); }
  setInterval(function () { contar(); }, 120000);

  window.Ferm = { elegir: elegir, ingresar: ingresar, panel: panel, imprimir: imprimir };
})();
