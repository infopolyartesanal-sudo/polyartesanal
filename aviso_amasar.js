/* Aviso de amasado para pedidos con fermentación larga (Panadería).
   Pedidos con masa madre, baguette, ciabatta/panini, focaccia, pan de molde o pan de campo:
   avisa 25 h antes de la entrega (o en la fecha que Poly haya fijado a mano: aviso_masa_at),
   con cartel y sonido que se repite hasta que alguien toca "Ya lo amasé". */
(function () {
  var URL_ = 'https://sinoeoaktirnscdpbvdc.supabase.co/rest/v1/';
  function KEY() { /* eslint-disable-next-line no-undef */ return (typeof SUPABASE_KEY !== 'undefined' && SUPABASE_KEY) || ''; }
  function hdr() { return { apikey: KEY(), Authorization: 'Bearer ' + KEY(), 'Content-Type': 'application/json' }; }
  var ANTES_H = 25;
  var RE = /masa madre|baguet|ciabat|panin+i|focac+ia|molde|\bpan m\.?\s|pan de campo/i;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  function hoyISO() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  // hora de entrega: "8:00", "16 a 18 h", "a la mañana", "a la tarde"…
  function horaDe(t) {
    t = String(t || '').toLowerCase();
    var m = t.match(/(\d{1,2})(?::(\d{2}))?/); if (m) return [+m[1], +(m[2] || 0)];
    if (/tarde/.test(t)) return [16, 0]; if (/noche/.test(t)) return [20, 0];
    return [8, 0];
  }
  function entrega(p) { var f = String(p.fecha_retiro || '').split('-'), h = horaDe(p.hora_retiro); return new Date(+f[0], +f[1] - 1, +f[2], h[0], h[1]); }
  function avisoDe(p) { return p.aviso_masa_at ? new Date(p.aviso_masa_at) : new Date(entrega(p).getTime() - ANTES_H * 3600000); }
  function cuando(d) { return DIAS[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

  var css = document.createElement('style');
  css.textContent = '#avisoAmasar{position:fixed!important;left:8px;right:8px;bottom:140px;z-index:1002;background:#E65100!important;color:#fff!important;border-radius:12px;padding:12px 14px;font:600 15px system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.35);max-height:70vh;overflow:auto}' +
    '#avisoAmasar *{color:#fff!important}#avisoAmasar .it{font-weight:400;font-size:14px;margin:2px 0 0 4px}' +
    '#avisoAmasar button{margin:8px 8px 0 0;padding:8px 12px;border-radius:8px;border:none!important;font-weight:700;background:#fff!important;color:#BF360C!important;cursor:pointer}';
  document.head.appendChild(css);

  var AC = null;
  function desbloquear() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) {} }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, desbloquear, { passive: true }); });
  function sonar() {
    try { desbloquear(); if (!AC) return; var t0 = AC.currentTime;
      [[660, 0], [880, .25], [660, .5], [880, .75], [990, 1.0]].forEach(function (x) {
        var o = AC.createOscillator(), g = AC.createGain(); o.connect(g); g.connect(AC.destination); o.type = 'triangle'; o.frequency.value = x[0];
        g.gain.setValueAtTime(0.22, t0 + x[1]); g.gain.exponentialRampToValueAtTime(0.001, t0 + x[1] + 0.22); o.start(t0 + x[1]); o.stop(t0 + x[1] + 0.24);
      });
    } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 700]); } catch (e) {}
  }

  var ultimoSonido = 0; try { ultimoSonido = +localStorage.getItem("aviso_amasar_sono") || 0; } catch (e) {}
  async function revisar() {
    var rows;
    try {
      var r = await fetch(URL_ + 'pedidos_clientes?select=id,numero,cliente,fecha_retiro,hora_retiro,estado,aviso_masa_at,aviso_masa_visto_at,pedidos_clientes_items(producto,cantidad,unidad,sector)'
        + '&estado=not.in.(entregado,cancelado,por_confirmar)&aviso_masa_visto_at=is.null&fecha_retiro=gte.' + hoyISO() + '&order=fecha_retiro.asc', { headers: hdr() });
      if (!r.ok) return; rows = await r.json();
    } catch (e) { return; }
    var ahora = Date.now();
    var L = (rows || []).map(function (p) {
      var its = (p.pedidos_clientes_items || []).filter(function (i) { return RE.test(i.producto || ''); });
      return { p: p, its: its, aviso: avisoDe(p) };
    }).filter(function (x) { return x.its.length && x.aviso.getTime() <= ahora; });
    var box = document.getElementById('avisoAmasar');
    if (!L.length) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.id = 'avisoAmasar'; document.body.appendChild(box); }
    box.innerHTML = '🫓 <b>Hay que amasar para ' + (L.length === 1 ? 'un pedido' : L.length + ' pedidos') + '</b> (fermentación larga):' +
      L.map(function (x) {
        return '<div style="margin-top:8px"><b>#' + esc(x.p.numero) + ' · ' + esc(x.p.cliente || '') + '</b> — se entrega el ' + cuando(entrega(x.p)) +
          x.its.map(function (i) { return '<div class="it">• ' + String(i.cantidad).replace('.', ',') + ' ' + esc(i.producto) + '</div>'; }).join('') +
          '<button type="button" data-ok="' + x.p.id + '">✅ Ya lo amasé</button></div>';
      }).join('') +
      (typeof switchTab === 'function' ? '<button type="button" id="avAmVer">Ver pedidos</button>' : '');
    box.querySelectorAll('[data-ok]').forEach(function (b) { b.onclick = async function () {
      b.disabled = true;
      try { await fetch(URL_ + 'rpc/pedido_aviso_masa_visto', { method: 'POST', headers: hdr(), body: JSON.stringify({ p_id: +b.dataset.ok }) });
        if (window.addToLog) try { addToLog('🫓 Amasado para el pedido #' + (L.find(function (x) { return String(x.p.id) === b.dataset.ok; }) || { p: {} }).p.numero, 'receta'); } catch (e2) {}
      } catch (e) {}
      revisar();
    }; });
    var v = document.getElementById('avAmVer'); if (v) v.onclick = function () { try { switchTab('pedidos-panaderia'); } catch (e) {} };
    if (ahora - ultimoSonido > 3590000) { ultimoSonido = ahora; try { localStorage.setItem("aviso_amasar_sono", String(ahora)); } catch (e) {} sonar(); }   // suena cada 1 h hasta que confirmen
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(revisar, 2000); }); else setTimeout(revisar, 2000);
  setInterval(revisar, 60000);
})();
