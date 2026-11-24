/* Registro del sector leído de la base (lo cargado desde cualquier celular o computadora), con días anteriores.
   Uso: registroSector({ sector:'cocina', panel:'log-panel', tablas:['cocina_stock'], leudado:true, noTrabaja:'...' })
   Reemplaza renderLog() y exportLog() del módulo. */
(function () {
  function hoy() { return new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(x) { return String(Math.round((+x || 0) * 1000) / 1000).replace('.', ','); }
  function hora(t) { return new Date(t).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' }); }
  var DEP = { local: 'local', heladera: 'heladera', freezer: 'freezer', estante: 'estante', cantidad: 'cámara', total: 'freezer' };
  var NOMBRES = { emp_clasicas: 'Tapas Empanadas Clásicas', emp_integral: 'Tapas Empanadas Integral', medialunas_manteca: 'Facturas de Manteca', facturas_grasa: 'Facturas de Grasa', cremonas: 'Cremonas', libritos_clasicos: 'Libritos Clásicos', libritos_integrales: 'Libritos Integrales', pan_caserito: 'Pan Caserito', palitos_queso: 'Palitos de Queso', bizcochitos: 'Bizcochitos' };
  function nombre(id, n) { if (n) return n; if (NOMBRES[id]) return NOMBRES[id]; return String(id || '').replace(/^g_/, '').replace(/_/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }); }
  var TAB = { cocina_stock: 'Cocina', pasteleria_stock: 'Pastelería', freezer_panaderia: 'freezer de Panadería', camara_panaderia: 'cámara de Panadería' };
  function motivo(m) {
    m = m || '';
    if (m === 'inventario' || m.indexOf('conteo') === 0) return ['📋', 'Conteo / ajuste de stock'];
    if (m === 'leudado' || m === 'leudado pedido') return ['🥖', 'Sacado a leudar'];
    if (m === 'madrugada') return ['🌙', 'Madrugada'];
    if (m.indexOf('madrugada:') === 0) return ['🌙', 'Madrugada · ' + m.slice(10).trim()];
    if (m.indexOf('cocina:') === 0) return ['🍳', 'Cocina · ' + m.slice(7).trim()];
    if (m === 'cocina' || m === 'pasteleria' || m === 'panaderia') return ['🏭', m.charAt(0).toUpperCase() + m.slice(1)];
    return ['•', m];
  }

  window.registroSector = function (cfg) {
    var R = { fecha: hoy(), filas: [] };
    window.REG_SECTOR = R;
    var panel = document.getElementById(cfg.panel); if (!panel) return;
    // barra de fecha arriba de la lista
    var barra = document.createElement('div');
    barra.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:8px 12px 0';
    var b = 'padding:8px 12px;border-radius:10px;border:1px solid #ccc;background:#fff;color:#222;font-weight:700;cursor:pointer';
    barra.innerHTML = '<button data-m="-1" style="' + b + '">◀</button><input type="date" style="padding:7px;border-radius:10px;border:1px solid #ccc;font-size:15px;color:#222;background:#fff">'
      + '<button data-m="1" style="' + b + '">▶</button><button data-h="1" style="' + b + ';font-weight:600">Hoy</button>';
    panel.parentNode.insertBefore(barra, panel);
    var inp = barra.querySelector('input');
    inp.onchange = function () { R.fecha = inp.value || hoy(); window.renderLog(); };
    barra.querySelectorAll('[data-m]').forEach(function (x) { x.onclick = function () { var d = new Date(R.fecha + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + (+x.dataset.m)); R.fecha = d.toISOString().slice(0, 10); window.renderLog(); }; });
    barra.querySelector('[data-h]').onclick = function () { R.fecha = hoy(); window.renderLog(); };

    window.renderLog = async function () {
      inp.value = R.fecha;
      panel.innerHTML = '<div class="empty-state">Cargando el registro…</div>';
      var d0 = new Date(R.fecha + 'T00:00:00-03:00'), d1 = new Date(d0.getTime() + 86400e3);
      var r = function (campo) { return campo + '=gte.' + encodeURIComponent(d0.toISOString()) + '&' + campo + '=lt.' + encodeURIComponent(d1.toISOString()); };
      var pedidos = [
        cfg.produccion === false ? Promise.resolve([]) : sbSelect('produccion', '?sector=eq.' + cfg.sector + '&' + r('fecha') + '&order=fecha.asc&select=fecha,producto,tandas,unidades,estado'),
        (cfg.tablas && cfg.tablas.length) ? sbSelect('movimientos_terminados', '?tabla=in.(' + cfg.tablas.join(',') + ')&' + r('fecha') + '&order=fecha.asc&select=fecha,tabla,producto_id,nombre,campo,delta,valor,motivo,usuario') : Promise.resolve([]),
        cfg.motivoLike ? sbSelect('movimientos_terminados', '?motivo=like.' + encodeURIComponent(cfg.motivoLike) + '&' + r('fecha') + '&order=fecha.asc&select=fecha,tabla,producto_id,nombre,campo,delta,valor,motivo,usuario') : Promise.resolve([]),
        cfg.leudado ? sbSelect('cocina_leudado', '?' + r('created_at') + '&order=created_at.asc&select=created_at,producto_nombre,cantidad,origen,estado') : Promise.resolve([]),
        cfg.registroDiario ? sbSelect('registro_diario', '?sector=eq.' + cfg.sector + '&' + r('created_at') + '&order=created_at.asc&select=created_at,tipo,descripcion') : Promise.resolve([])
      ];
      var res;
      try { res = await Promise.all(pedidos); } catch (e) { res = [null, null, null, null, null]; }
      if (res.every(function (x) { return x === null; })) { panel.innerHTML = '<div class="empty-state">No se pudo leer el registro. Revisá la conexión.</div>'; return; }
      var prod = res[0] || [], mov = (res[1] || []).concat(res[2] || []), leu = res[3] || [], rd = res[4] || [];
      var vistos = {}; mov = mov.filter(function (m) { var k = m.fecha + m.tabla + m.producto_id + m.campo; if (vistos[k]) return false; vistos[k] = 1; return true; });
      var filas = [];
      prod.forEach(function (p) { filas.push({ t: p.fecha, ic: '🏭', txt: '<b>Producción: ' + esc(p.producto) + '</b> — ' + (+p.tandas ? num(p.tandas) + ' tanda' + (+p.tandas === 1 ? '' : 's') : '') + (p.unidades ? ' (' + num(p.unidades) + ')' : '') + (p.estado === 'sin_receta' ? ' <span style="color:#B71C1C">· sin receta vinculada</span>' : '') }); });
      mov.forEach(function (m) {
        var mt = motivo(m.motivo), cambio = '';
        if (m.campo && m.campo.charAt(0) === '{') { try { cambio = Object.entries(JSON.parse(m.campo)).map(function (e) { return e[0].replace(/_/g, ' ') + ' ' + (e[1] > 0 ? '+' : '') + num(e[1]); }).join(', '); } catch (e) {} }
        else if (m.delta != null) cambio = (m.delta > 0 ? '+' : '') + num(m.delta);
        var donde = (TAB[m.tabla] && m.tabla.indexOf('panaderia') > 0) ? TAB[m.tabla] : (DEP[m.campo] || m.campo || '');
        filas.push({ t: m.fecha, ic: mt[0], txt: '<b>' + esc(nombre(m.producto_id, m.nombre)) + '</b> ' + esc(cambio) + (donde ? ' en ' + esc(donde) : '') + (m.valor != null ? ' · quedó ' + num(m.valor) : '') + '<div style="font-size:11px;color:#888">' + esc(mt[1]) + (m.usuario ? ' · ' + esc(m.usuario) : '') + '</div>' });
      });
      leu.forEach(function (l) { filas.push({ t: l.created_at, ic: '🥖', txt: '<b>A leudar: ' + esc(l.producto_nombre) + '</b> × ' + num(l.cantidad) + '<div style="font-size:11px;color:#888">desde ' + esc(l.origen || '') + ' · ' + esc((l.estado || '').replace('_', ' ')) + '</div>' }); });
      rd.forEach(function (x) { filas.push({ t: x.created_at, ic: '📝', txt: esc(x.descripcion || x.tipo) }); });
      if (R.fecha === hoy() && typeof log !== 'undefined' && Array.isArray(log)) {
        log.forEach(function (e) { var p = String(e.time || '00:00').split(':'); filas.push({ t: R.fecha + 'T' + (p[0] || '00').padStart(2, '0') + ':' + (p[1] || '00').slice(0, 2).padStart(2, '0') + ':00-03:00', ic: '📱', txt: esc(e.text) + '<div style="font-size:11px;color:#888">en este aparato</div>' }); });
      }
      filas.sort(function (a, b) { return new Date(b.t) - new Date(a.t); });
      R.filas = filas;
      var dia = new Date(R.fecha + 'T12:00:00Z').getUTCDay();
      var html = '<div style="font-size:13px;color:#555;margin:4px 0 10px">' + new Date(R.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) + '</div>';
      var resumen = {}; prod.filter(function (p) { return +p.unidades > 0 || +p.tandas > 0; }).forEach(function (p) { resumen[p.producto] = (resumen[p.producto] || 0) + (+p.unidades || +p.tandas || 0); });
      if (Object.keys(resumen).length) html += '<div class="log-item" style="background:#F1F8E9;color:#1a1a1a"><div class="log-text"><b>Producción del día:</b> ' + Object.keys(resumen).map(function (k) { return esc(k) + ' ' + num(resumen[k]); }).join(' · ') + '</div></div>';
      if (!filas.length) html += '<div class="empty-state">No hay nada registrado ese día.' + (cfg.noTrabaja && cfg.noTrabaja.indexOf(dia) >= 0 ? '<br>Ese día el sector no trabaja.' : '') + '</div>';
      html += filas.map(function (f) { return '<div class="log-item log-entry"><div class="log-time">' + hora(f.t) + ' ' + f.ic + '</div><div class="log-text">' + f.txt + '</div></div>'; }).join('');
      panel.innerHTML = html;
      var q = document.getElementById('search-log'); if (q && q.value && typeof filterLog === 'function') filterLog(q.value);
    };
    window.exportLog = function () {
      var tmp = document.createElement('div');
      var text = '=== REGISTRO ' + cfg.sector.toUpperCase() + ' - ' + R.fecha.split('-').reverse().join('/') + ' ===\n\n'
        + R.filas.slice().reverse().map(function (f) { tmp.innerHTML = f.txt; return '[' + hora(f.t) + '] ' + tmp.innerText.replace(/\s+/g, ' '); }).join('\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      a.download = 'registro_' + cfg.sector + '_' + R.fecha + '.txt'; a.click();
    };
    var sw = window.switchTab;
    if (typeof sw === 'function' && !sw._reg) { window.switchTab = function (n) { var r = sw.apply(this, arguments); if (n === cfg.tab) window.renderLog(); return r; }; window.switchTab._reg = 1; }
    window.renderLog();
  };
})();
