/* Masas fermentando — seguimiento con código por bolsa (Panadería / Madrugada).
   - Ferm.elegir(receta, rendimiento, alStock): al completar una tanda pregunta si va a stock o a fermentar.
   - Ferm.ingresar(receta, rendimiento): pone masas a fermentar (cámara o panadería), con tiempo de fermentación, y genera un código por bolsa.
   - Botón flotante "🫧 Fermentando": lista, semáforo blanco → amarillo → naranja → rojo según el tiempo, y alarma sonora en rojo. */
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
  function fecha(d) { d = new Date(d); return DIAS[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function dur(min) {
    min = Math.max(0, Math.round(min));
    if (min < 60) return min + ' min'; var h = Math.floor(min / 60), m = min % 60;
    if (h < 24) return h + ' h' + (m ? ' ' + m + ' min' : '');
    var d = Math.floor(h / 24); h = h % 24; return d + ' día' + (d > 1 ? 's' : '') + (h ? ' ' + h + ' h' : '');
  }
  function horasTxt(h) { h = +h; return h % 24 === 0 ? (h / 24) + ' día' + (h / 24 > 1 ? 's' : '') : (h >= 24 ? dur(h * 60) : h + ' h'); }

  // ── Semáforo: blanco < 50% · amarillo 50–80% · naranja 80–100% · rojo = tiempo cumplido
  var NIV = {
    blanco: { bg: '#ffffff', bd: '#9e9e9e', tx: '#1a1a1a', et: 'En tiempo' },
    amarillo: { bg: '#fff6c2', bd: '#c9a400', tx: '#3d3000', et: 'Más de la mitad' },
    naranja: { bg: '#ffd9b0', bd: '#d35f00', tx: '#4a2100', et: 'Casi lista' },
    rojo: { bg: '#ffd1d1', bd: '#c62828', tx: '#5c0000', et: 'TIEMPO CUMPLIDO' },
    sin: { bg: '#eeeeee', bd: '#757575', tx: '#1a1a1a', et: 'Sin tiempo' }
  };
  function estado(r) {
    var tr = (Date.now() - new Date(r.ingreso_at)) / 60000;
    if (!(r.fermentar_horas > 0)) return { n: 'sin', tr: tr };
    var tot = r.fermentar_horas * 60, p = tr / tot;
    return { n: p >= 1 ? 'rojo' : p >= 0.8 ? 'naranja' : p >= 0.5 ? 'amarillo' : 'blanco', tr: tr, falta: tot - tr, p: p, vence: new Date(new Date(r.ingreso_at).getTime() + tot * 60000) };
  }
  var ORDEN = { rojo: 4, naranja: 3, amarillo: 2, blanco: 1, sin: 0 };

  var css = document.createElement('style');
  css.textContent =
    '#fermBtn{position:fixed!important;left:12px;bottom:84px;z-index:900;border:2px solid #1a1a1a!important;border-radius:24px;padding:10px 16px;font:700 14px system-ui,sans-serif!important;box-shadow:0 3px 12px rgba(0,0,0,.3);cursor:pointer;background:#534AB7!important;color:#fff!important}' +
    '#fermBtn.parpadea{animation:fermPal 1s infinite}@keyframes fermPal{50%{transform:scale(1.08)}}' +
    '.fermOv{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:flex-end;justify-content:center;font-family:system-ui,sans-serif}' +
    '.fermOv .fermBox{background:#fff!important;color:#1a1a1a!important;width:100%;max-width:560px;max-height:92vh;overflow:auto;border-radius:16px 16px 0 0;padding:16px;box-sizing:border-box}' +
    '.fermOv h3{margin:0 0 10px;font-size:17px;color:#1a1a1a!important}.fermOv label{display:block;font-size:13px;color:#333!important;margin:10px 0 4px;font-weight:600}' +
    '.fermOv input,.fermOv textarea,.fermOv select{width:100%;box-sizing:border-box;padding:10px;font-size:16px;border:1px solid #999!important;border-radius:8px;background:#fff!important;color:#1a1a1a!important}' +
    '.fermOv button{font-family:system-ui,sans-serif;cursor:pointer;background:#fff!important;color:#1a1a1a!important;border:1px solid #888!important}' +
    '.fermOv .fermSeg{display:flex;gap:8px;flex-wrap:wrap}.fermOv .fermSeg button{flex:1;min-width:70px;padding:11px 8px;border:2px solid #999!important;border-radius:10px;font-size:15px}' +
    '.fermOv .fermSeg button.on{border-color:#534AB7!important;background:#534AB7!important;color:#fff!important;font-weight:700}' +
    '.fermOv .fermOk{width:100%;margin-top:14px;padding:13px;border:none!important;border-radius:10px;background:#534AB7!important;color:#fff!important;font-size:16px;font-weight:700}' +
    '.fermOv .fermOk[disabled]{background:#6f68c4!important;color:#fff!important}' +
    '.fermOv .fermSec{width:100%;margin-top:8px;padding:11px;border-radius:10px;font-size:15px}' +
    '.fermOv .fermCard{border:2px solid #ccc;border-radius:10px;padding:10px 12px;margin:8px 0}' +
    '.fermOv .fermCod{font:800 18px ui-monospace,monospace;letter-spacing:1px}.fermOv .fermAcc{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}.fermOv .fermAcc button{padding:8px 10px;border-radius:8px;font-size:13px}' +
    '.fermOv .fermChip{display:inline-block;font-size:12px;padding:2px 8px;border-radius:12px;background:#fff!important;color:#1a1a1a!important;border:1px solid #999;margin-left:6px}' +
    '.fermOv .fermEst{display:inline-block;font-size:12px;font-weight:800;padding:2px 8px;border-radius:12px;margin-left:6px}' +
    '.fermOv .muted{color:#444!important}' +
    '#fermAviso{position:fixed!important;left:8px;right:8px;top:8px;z-index:1001;background:#c62828!important;color:#fff!important;border-radius:12px;padding:12px 14px;font:600 15px system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.35)}' +
    '#fermAviso b,#fermAviso span{color:#fff!important}' +
    '#fermAviso button{margin:8px 8px 0 0;padding:8px 12px;border-radius:8px;border:none!important;font-weight:700;background:#fff!important;color:#b71c1c!important;cursor:pointer}';
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
    modal('<h3>✅ ' + esc(receta) + '</h3><p class="muted" style="margin:0 0 6px;font-size:14px">¿Qué hacés con esta tanda?</p>' +
      '<button type="button" class="fermOk" id="fermA">🫧 Poner a fermentar</button>' +
      '<button type="button" class="fermSec" id="fermB">📦 Ya está lista (va a stock, como siempre)</button>' +
      '<button type="button" class="fermSec" id="fermC">Cancelar</button>');
    document.getElementById('fermA').onclick = function () { ingresar(receta, rendimiento); };
    document.getElementById('fermB').onclick = function () { cerrar(); if (alStock) alStock(); };
    document.getElementById('fermC').onclick = cerrar;
  }

  // ── Selector de tiempo (horas o días), con atajos
  function selTiempo(pref, ini) {
    var atajos = [[8, '8 h'], [12, '12 h'], [24, '1 día'], [48, '2 días'], [72, '3 días']];
    var esDia = ini && ini % 24 === 0;
    return '<label>¿Cuánto tiene que fermentar?</label><div class="fermSeg" id="' + pref + 'At">' +
      atajos.map(function (a) { return '<button type="button" data-h="' + a[0] + '"' + (+ini === a[0] ? ' class="on"' : '') + '>' + a[1] + '</button>'; }).join('') + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:8px"><input id="' + pref + 'N" type="number" inputmode="decimal" min="0.5" step="0.5" placeholder="otro" value="' + (ini ? (esDia ? ini / 24 : ini) : '') + '" style="flex:1">' +
      '<select id="' + pref + 'U" style="width:auto;flex:0 0 110px"><option value="1"' + (esDia ? '' : ' selected') + '>horas</option><option value="24"' + (esDia ? ' selected' : '') + '>días</option></select></div>';
  }
  function engancharTiempo(pref) {
    var box = document.getElementById(pref + 'At'), n = document.getElementById(pref + 'N'), u = document.getElementById(pref + 'U');
    function leer() { var v = parseFloat(String(n.value).replace(',', '.')); return v > 0 ? v * (+u.value) : 0; }
    function marcar() { box.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', +x.dataset.h === leer()); }); }
    box.onclick = function (e) {
      var b = e.target.closest('button[data-h]'); if (!b) return;
      var h = +b.dataset.h; if (h % 24 === 0) { n.value = h / 24; u.value = '24'; } else { n.value = h; u.value = '1'; }
      marcar();
    };
    n.oninput = marcar; u.onchange = marcar;
    return leer;
  }
  function ultimoTiempo(rec) { try { return +JSON.parse(localStorage.getItem('ferm_tiempos') || '{}')[rec] || 0; } catch (e) { return 0; } }
  function guardarTiempo(rec, h) { try { var o = JSON.parse(localStorage.getItem('ferm_tiempos') || '{}'); o[rec] = h; localStorage.setItem('ferm_tiempos', JSON.stringify(o)); } catch (e) {} }

  // ── Poner masas a fermentar
  function ingresar(receta, rendimiento) {
    var ub = 'camara';
    modal('<h3>🫧 A fermentar: ' + esc(receta) + '</h3>' +
      '<label>¿Dónde queda?</label><div class="fermSeg"><button type="button" id="fUbC" class="on">❄️ Cámara</button><button type="button" id="fUbP">🥖 Panadería</button></div>' +
      selTiempo('fT', ultimoTiempo(receta)) +
      '<label>¿Cuántas masas / bolsas? (cada una lleva su código)</label><input id="fCant" type="number" inputmode="numeric" min="1" max="60" value="1">' +
      '<label>¿Qué tiene cada bolsa? (opcional)</label><input id="fCont" placeholder="' + esc(rendimiento ? 'ej: ' + String(rendimiento).split('—')[0].trim() : 'ej: 8 kg, 10 panes, 1 tanda') + '">' +
      '<label>Nota (opcional)</label><input id="fNota" placeholder="ej: para el pedido de mañana">' +
      '<button type="button" class="fermOk" id="fOk">🫧 Poner a fermentar</button><button type="button" class="fermSec" id="fNo">Cancelar</button>');
    var bc = document.getElementById('fUbC'), bp = document.getElementById('fUbP');
    bc.onclick = function () { ub = 'camara'; bc.classList.add('on'); bp.classList.remove('on'); };
    bp.onclick = function () { ub = 'panaderia'; bp.classList.add('on'); bc.classList.remove('on'); };
    var leerT = engancharTiempo('fT');
    document.getElementById('fNo').onclick = cerrar;
    document.getElementById('fOk').onclick = async function () {
      var hs = leerT(); if (!(hs > 0)) { alert('Poné cuánto tiempo tiene que fermentar (horas o días).'); return; }
      var b = this; b.disabled = true; b.textContent = 'Guardando…';
      try {
        var rows = await rpc('masa_ingresar', { receta: receta, ubicacion: ub, horas: hs, cantidad: +document.getElementById('fCant').value || 1,
          contenido: document.getElementById('fCont').value, notas: document.getElementById('fNota').value, sector: 'panaderia' });
        guardarTiempo(receta, hs);
        if (window.addToLog) try { addToLog('🫧 A fermentar ' + horasTxt(hs) + ' (' + (UB[ub] || ub) + '): ' + receta + ' · ' + rows.map(function (r) { return r.codigo; }).join(', '), 'receta'); } catch (e) {}
        listo(rows);
        contar();
      } catch (e) { b.disabled = false; b.textContent = '🫧 Poner a fermentar'; alert(e.message); }
    };
  }

  function listo(rows) {
    modal('<h3>🫧 Fermentando</h3><p class="muted" style="margin:0 0 8px;font-size:14px">Pegale a cada bolsa su etiqueta:</p>' +
      rows.map(function (r) { return '<div class="fermCard"><span class="fermCod">' + esc(r.codigo) + '</span><span class="fermChip">' + (UB[r.ubicacion] || '') + '</span><div class="muted" style="font-size:13px">' + esc(r.receta) + (r.de_bolsas > 1 ? ' · bolsa ' + r.bolsa + ' de ' + r.de_bolsas : '') + (r.fermentar_horas ? ' · fermenta ' + horasTxt(r.fermentar_horas) : '') + '</div></div>'; }).join('') +
      botonesImprimir() + '<button type="button" class="fermSec" id="fFin">Listo</button>');
    document.querySelectorAll('#fermOv [data-imp]').forEach(function (x) { x.onclick = function () { imprimir(rows, x.dataset.imp); }; });
    document.getElementById('fFin').onclick = cerrar;
  }

  // ── Etiquetas. modo: 'ticket' = impresora térmica del local (rollo 80 mm, como la caja) · 'etiqueta' = etiquetadora 60×40 mm · 'a4' = hoja para recortar
  function modoGuardado() { try { return localStorage.getItem('ferm_impresora') || 'ticket'; } catch (e) { return 'ticket'; } }
  function imprimir(rows, modo) {
    modo = modo === true ? 'a4' : (modo || modoGuardado());
    try { localStorage.setItem('ferm_impresora', modo); } catch (e) {}
    var w = window.open('', '_blank'); if (!w) { alert('Habilitá las ventanas emergentes para imprimir'); return; }
    var et = rows.map(function (r) {
      var e = estado(r);
      return '<div class="et"><div class="t">POLY · MASA EN FERMENTACIÓN</div><div class="c">' + esc(r.codigo) + '</div>' +
        '<div class="r">' + esc(r.receta) + '</div>' + (r.contenido ? '<div class="s">' + esc(r.contenido) + '</div>' : '') +
        '<div class="s">Entró: <b>' + fecha(r.ingreso_at) + '</b> · ' + (r.ubicacion === 'camara' ? 'Cámara' : 'Panadería') + '</div>' +
        (e.vence ? '<div class="s' + (modo === 'ticket' ? ' g' : '') + '">Lista: <b>' + fecha(e.vence) + '</b> (' + horasTxt(r.fermentar_horas) + ')</div>' : '') +
        '<div class="s">' + (r.de_bolsas > 1 ? 'Bolsa ' + r.bolsa + ' de ' + r.de_bolsas + ' · ' : '') + (r.ingreso_por ? esc(r.ingreso_por) : '') + '</div></div>';
    }).join('');
    var estilo = modo === 'ticket'
      ? '@page{size:80mm auto;margin:0}body{width:72mm;margin:0 auto}.et{width:72mm;padding:3mm 1mm 6mm;border-bottom:1px dashed #000;page-break-after:always;break-after:page}' +
        '.t{font-size:9pt;font-weight:700;text-align:center;letter-spacing:1px}.c{font:900 30pt Arial,sans-serif;text-align:center;letter-spacing:1px;margin:2mm 0;border:2px solid #000;padding:1mm 0}' +
        '.r{font-size:14pt;font-weight:700;text-align:center;line-height:1.15}.s{font-size:11pt;margin-top:1.2mm;text-align:center}.g{font-size:13pt;font-weight:700}'
      : (modo === 'a4' ? '@page{size:A4;margin:8mm}body{display:flex;flex-wrap:wrap;gap:3mm}.et{width:60mm;height:40mm;border:1px dashed #999}'
                       : '@page{size:60mm 40mm;margin:0}.et{width:60mm;height:40mm;page-break-after:always}') +
        '.et{box-sizing:border-box;padding:2.5mm 3mm;overflow:hidden}.t{font-size:7pt;letter-spacing:.5px}.c{font:900 19pt Arial,sans-serif;letter-spacing:1px;margin:.5mm 0}' +
        '.r{font-size:9.5pt;font-weight:700;line-height:1.1}.s{font-size:7.5pt;margin-top:.5mm}';
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Etiquetas masas</title><style>body{margin:0;font-family:Arial,sans-serif;color:#000;background:#fff}.et{box-sizing:border-box}' + estilo +
      '</style></head><body>' + et + '<script>setTimeout(function(){window.print()},300)<\/script></body></html>');
    w.document.close();
  }
  function botonesImprimir() {
    return '<button type="button" class="fermOk" data-imp="ticket">🧾 Imprimir en la impresora del local</button>' +
      '<button type="button" class="fermSec" data-imp="etiqueta">🏷 Etiquetadora (60×40 mm)</button><button type="button" class="fermSec" data-imp="a4">📄 Hoja A4 (para recortar)</button>';
  }

  // ── Panel con todas las masas
  var FILTRO = 'todas', DATA = [];
  async function panel() {
    var o = modal('<h3>🫧 Masas fermentando</h3><div class="fermSeg" style="margin-bottom:8px"><button type="button" data-f="todas">Todas</button><button type="button" data-f="camara">❄️ Cámara</button><button type="button" data-f="panaderia">🥖 Panadería</button></div>' +
      '<input id="fBus" placeholder="Buscar por código o masa…" style="margin-bottom:4px"><div id="fLis"><p class="muted">Cargando…</p></div><button type="button" class="fermSec" id="fCer">Cerrar</button>');
    document.getElementById('fCer').onclick = cerrar;
    function pintar() {
      if (!document.getElementById('fLis')) return;
      o.querySelectorAll('[data-f]').forEach(function (b) { b.classList.toggle('on', b.dataset.f === FILTRO); });
      var q = (document.getElementById('fBus').value || '').toLowerCase();
      var L = DATA.filter(function (r) { return (FILTRO === 'todas' || r.ubicacion === FILTRO) && (!q || (r.codigo + ' ' + r.receta).toLowerCase().indexOf(q) >= 0); })
        .map(function (r) { return { r: r, e: estado(r) }; })
        .sort(function (a, b) { return ORDEN[b.e.n] - ORDEN[a.e.n] || (a.e.falta || 0) - (b.e.falta || 0); });
      var porRec = {}; L.forEach(function (x) { porRec[x.r.receta] = (porRec[x.r.receta] || 0) + 1; });
      document.getElementById('fLis').innerHTML = (L.length ? '<p class="muted" style="font-size:13px;margin:6px 0">' + L.length + ' masa' + (L.length > 1 ? 's' : '') + ': ' +
        Object.keys(porRec).map(function (k) { return esc(k) + ' ×' + porRec[k]; }).join(' · ') + '</p>' : '<p class="muted">No hay masas fermentando' + (FILTRO !== 'todas' ? ' acá' : '') + '.</p>') +
        L.map(function (x) {
          var r = x.r, e = x.e, N = NIV[e.n];
          var tiempo = e.n === 'sin' ? 'Entró hace <b>' + dur(e.tr) + '</b> · <b>tocá ⏱ y cargale el tiempo</b>'
            : e.n === 'rojo' ? '⏰ Cumplió su tiempo hace <b>' + dur(-e.falta) + '</b> → usarla ya o tirarla'
            : 'Faltan <b>' + dur(e.falta) + '</b> · lista ' + fecha(e.vence);
          return '<div class="fermCard" style="background:' + N.bg + '!important;border-color:' + N.bd + '!important;color:' + N.tx + '!important">' +
            '<span class="fermCod">' + esc(r.codigo) + '</span><span class="fermChip">' + (UB[r.ubicacion] || '') + '</span>' +
            '<span class="fermEst" style="background:' + N.bd + '!important;color:' + (e.n === 'amarillo' ? '#1a1a1a' : '#fff') + '!important">' + N.et + '</span>' +
            '<div style="font-weight:700;margin-top:4px">' + esc(r.receta) + (r.contenido ? ' <span style="font-weight:400">· ' + esc(r.contenido) + '</span>' : '') + '</div>' +
            '<div style="font-size:13px;margin-top:2px">' + tiempo + '</div>' +
            '<div style="font-size:12px;margin-top:2px">Entró ' + fecha(r.ingreso_at) + (r.fermentar_horas ? ' · fermenta ' + horasTxt(r.fermentar_horas) : '') + (r.ingreso_por ? ' · ' + esc(r.ingreso_por) : '') + '</div>' +
            (r.notas ? '<div style="font-size:13px;margin-top:2px">📝 ' + esc(r.notas) + '</div>' : '') +
            '<div class="fermAcc"><button type="button" data-a="usada" data-id="' + r.id + '">✅ Sacar para usar/hornear</button><button type="button" data-a="tiempo" data-id="' + r.id + '">⏱ Tiempo</button>' +
            '<button type="button" data-a="mover" data-id="' + r.id + '">↔ A ' + (r.ubicacion === 'camara' ? 'Panadería' : 'Cámara') + '</button>' +
            '<button type="button" data-a="print" data-id="' + r.id + '">🖨 Etiqueta</button><button type="button" data-a="descartada" data-id="' + r.id + '" style="color:#b71c1c!important;border-color:#b71c1c!important">🗑 Tirar</button></div></div>';
        }).join('');
    }
    panel.pintar = pintar;
    o.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { FILTRO = b.dataset.f; pintar(); }; });
    document.getElementById('fBus').oninput = pintar;
    document.getElementById('fLis').onclick = async function (ev) {
      var b = ev.target.closest('button[data-a]'); if (!b) return;
      var r = DATA.find(function (x) { return String(x.id) === b.dataset.id; }); if (!r) return;
      var a = b.dataset.a;
      if (a === 'print') return imprimir([r], false);
      if (a === 'tiempo') return cambiarTiempo(r);
      var p = { id: r.id, accion: a };
      if (a === 'mover') p.ubicacion = r.ubicacion === 'camara' ? 'panaderia' : 'camara';
      if (a === 'descartada') { var n = prompt('¿Por qué se tira ' + r.codigo + '? (opcional)', estado(r).n === 'rojo' ? 'Se pasó de fermentación' : ''); if (n === null) return; p.nota = n; }
      if (a === 'usada' && !confirm('¿Sacar ' + r.codigo + ' (' + r.receta + ') de fermentación?')) return;
      b.disabled = true;
      try {
        await rpc('masa_actualizar', p);
        if (window.addToLog) try { addToLog((a === 'usada' ? '✅ Sacó de fermentación: ' : a === 'mover' ? '↔ Movió masa: ' : '🗑 Tiró masa: ') + r.codigo + ' · ' + r.receta, 'receta'); } catch (e2) {}
        await refrescar(); pintar();
      } catch (err) { b.disabled = false; alert(err.message); }
    };
    try { await refrescar(); pintar(); } catch (e) { document.getElementById('fLis').innerHTML = '<p style="color:#b71c1c">' + esc(e.message) + '</p>'; }
  }

  function cambiarTiempo(r) {
    modal('<h3>⏱ Tiempo de fermentación · ' + esc(r.codigo) + '</h3><p class="muted" style="margin:0;font-size:14px">' + esc(r.receta) + ' · entró ' + fecha(r.ingreso_at) + '</p>' +
      selTiempo('cT', r.fermentar_horas || ultimoTiempo(r.receta)) +
      '<p class="muted" style="font-size:12px">Se cuenta desde que entró a fermentar.</p><button type="button" class="fermOk" id="cOk">Guardar</button><button type="button" class="fermSec" id="cNo">Volver</button>');
    var leer = engancharTiempo('cT');
    document.getElementById('cNo').onclick = panel;
    document.getElementById('cOk').onclick = async function () {
      var hs = leer(); if (!(hs > 0)) { alert('Poné las horas o los días.'); return; }
      this.disabled = true;
      try { await rpc('masa_actualizar', { id: r.id, accion: 'tiempo', horas: hs }); guardarTiempo(r.receta, hs); delete VISTAS[r.id]; guardarVistas(); panel(); }
      catch (e) { this.disabled = false; alert(e.message); }
    };
  }

  // ── Alarma sonora (como la de pedidos) cuando una masa llega a rojo
  var AC = null;
  function desbloquear() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) {} }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, desbloquear, { passive: true }); });
  function sonar() {
    try {
      desbloquear(); if (!AC) return;
      var t0 = AC.currentTime;
      [[880, 0], [1175, .22], [880, .44], [1175, .66], [1320, .9]].forEach(function (x) {
        var o = AC.createOscillator(), g = AC.createGain(); o.connect(g); g.connect(AC.destination);
        o.type = 'square'; o.frequency.value = x[0];
        g.gain.setValueAtTime(0.18, t0 + x[1]); g.gain.exponentialRampToValueAtTime(0.001, t0 + x[1] + 0.2);
        o.start(t0 + x[1]); o.stop(t0 + x[1] + 0.22);
      });
    } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 600]); } catch (e) {}
  }
  var VISTAS = {}; try { VISTAS = JSON.parse(localStorage.getItem('ferm_vistas') || '{}') || {}; } catch (e) { VISTAS = {}; }
  function guardarVistas() { try { localStorage.setItem('ferm_vistas', JSON.stringify(VISTAS)); } catch (e) {} }
  var ultimoSonido = 0;
  function alarmas(d) {
    var ids = {}; d.forEach(function (r) { ids[r.id] = 1; });
    Object.keys(VISTAS).forEach(function (k) { if (!ids[k]) delete VISTAS[k]; }); guardarVistas();
    var nuevas = d.filter(function (r) { return estado(r).n === 'rojo' && !VISTAS[r.id]; });
    var av = document.getElementById('fermAviso');
    if (!nuevas.length) { if (av) av.remove(); return; }
    if (!av) { av = document.createElement('div'); av.id = 'fermAviso'; document.body.appendChild(av); }
    av.innerHTML = '⏰ ' + (nuevas.length === 1 ? 'Una masa cumplió' : nuevas.length + ' masas cumplieron') + ' su tiempo de fermentación:<br>' +
      nuevas.map(function (r) { return '<b>' + esc(r.codigo) + '</b> ' + esc(r.receta) + ' (' + (r.ubicacion === 'camara' ? 'Cámara' : 'Panadería') + ')'; }).join('<br>') +
      '<br><span style="font-weight:400">Usala ya o tirala.</span><br><button type="button" id="fAvVer">Ver masas</button><button type="button" id="fAvOk">Entendido</button>';
    function visto() { nuevas.forEach(function (r) { VISTAS[r.id] = 1; }); guardarVistas(); av.remove(); }
    document.getElementById('fAvVer').onclick = function () { visto(); panel(); };
    document.getElementById('fAvOk').onclick = visto;
    if (Date.now() - ultimoSonido > 55000) { ultimoSonido = Date.now(); sonar(); }   // repite cada minuto hasta que alguien toque "Entendido"
  }

  // ── Botón flotante con la cantidad y el color de la peor masa
  var btn = document.createElement('button'); btn.id = 'fermBtn'; btn.type = 'button'; btn.textContent = '🫧 Fermentando'; btn.onclick = panel;
  function poner() { if (document.body && !document.getElementById('fermBtn')) document.body.appendChild(btn); }
  async function refrescar() { DATA = await lista(); pintarBoton(); alarmas(DATA); return DATA; }
  function pintarBoton() {
    var peor = 'sin'; DATA.forEach(function (r) { var n = estado(r).n; if (ORDEN[n] > ORDEN[peor]) peor = n; });
    var col = { rojo: ['#c62828', '#fff'], naranja: ['#d35f00', '#fff'], amarillo: ['#ffd60a', '#1a1a1a'], blanco: ['#ffffff', '#1a1a1a'], sin: ['#534AB7', '#fff'] }[DATA.length ? peor : 'sin'];
    btn.style.setProperty('background', col[0], 'important'); btn.style.setProperty('color', col[1], 'important');
    btn.textContent = '🫧 Fermentando' + (DATA.length ? ' · ' + DATA.length : '');
    btn.classList.toggle('parpadea', peor === 'rojo' && DATA.length > 0);
  }
  async function contar() { try { await refrescar(); if (panel.pintar && document.getElementById('fLis')) panel.pintar(); } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { poner(); contar(); }); else { poner(); setTimeout(contar, 1500); }
  setInterval(contar, 60000);                         // cada minuto: colores y alarma
  setInterval(function () { if (DATA.length) { pintarBoton(); alarmas(DATA); } }, 15000);

  window.Ferm = { elegir: elegir, ingresar: ingresar, panel: panel, imprimir: imprimir };
})();
