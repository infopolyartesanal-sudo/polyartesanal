// Recordatorio para Panadería: registrar en el sistema cada tanda que se hace (no solo en el cuaderno).
// - Cada vez que se registra algo al freezer/cámara se guarda la hora (envolviendo encolarStock).
// - Cada 3 horas (7 a 22 h) aparece un cartel; si hace más de 3 h que no se registra nada, el cartel es más insistente.
(function () {
  const K_ULT = 'tandas_ultimo_registro', K_AVISO = 'tandas_ultimo_aviso';
  const CADA = 3 * 3600 * 1000;
  const ahora = () => Date.now();
  const lsGet = k => { try { return +localStorage.getItem(k) || 0; } catch (e) { return 0; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) {} };

  // Marca cada registro de stock hecho desde Panadería
  if (typeof window.encolarStock === 'function') {
    const orig = window.encolarStock;
    window.encolarStock = function (it) {
      try { if (it && it.body && (it.body.p_motivo === 'panaderia' || it.fn === 'stock_terminado_fijar')) lsSet(K_ULT, ahora()); } catch (e) {}
      return orig.apply(this, arguments);
    };
  }

  function hoyInicio() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }

  function cerrar() { const el = document.getElementById('rec-tandas'); if (el) el.remove(); }

  function mostrar() {
    if (document.getElementById('rec-tandas')) return;
    const ult = lsGet(K_ULT), nada = ult < hoyInicio();
    const hace = ult ? Math.round((ahora() - ult) / 3600000) : null;
    const txt = nada ? 'Hoy todavía no registraste ninguna tanda en el sistema.'
      : (hace >= 3 ? 'Hace ' + hace + ' h que no registrás ninguna tanda.' : 'Acordate de registrar cada tanda apenas la terminás.');
    const d = document.createElement('div');
    d.id = 'rec-tandas';
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99998;display:flex;align-items:center;justify-content:center;padding:16px;';
    d.innerHTML = '<div style="background:#fff;color:#222;max-width:420px;width:100%;border-radius:16px;padding:22px;box-shadow:0 10px 40px rgba(0,0,0,.4);font-family:inherit;">'
      + '<div style="font-size:40px;text-align:center;">📝➡️📱</div>'
      + '<div style="font-size:20px;font-weight:800;text-align:center;margin:8px 0 6px;">¿Registraste las tandas?</div>'
      + '<div style="font-size:16px;text-align:center;color:#444;line-height:1.4;">' + txt + '<br><br>Todo lo que anotás en el cuaderno cargalo en <b>Producción → Registrar tanda</b> (🧊 Freezer, Cámara o Fermentar). Si no, el freezer queda en 0 y Cocina no sabe qué hay.</div>'
      + '<button id="rec-t-ir" style="margin-top:18px;width:100%;padding:15px;border:none;border-radius:12px;background:#1B5E20;color:#fff;font-size:17px;font-weight:800;">✅ Registrar ahora</button>'
      + '<button id="rec-t-ok" style="margin-top:10px;width:100%;padding:13px;border:2px solid #1B5E20;border-radius:12px;background:#fff;color:#1B5E20;font-size:16px;font-weight:700;">Ya está todo cargado</button>'
      + '</div>';
    document.body.appendChild(d);
    lsSet(K_AVISO, ahora());
    document.getElementById('rec-t-ir').onclick = () => { cerrar(); if (typeof window.switchTab === 'function') window.switchTab('produccion'); };
    document.getElementById('rec-t-ok').onclick = () => { lsSet(K_ULT, ahora()); cerrar(); };
  }

  function revisar() {
    const h = new Date().getHours();
    if (h < 7 || h >= 22) return;
    if (ahora() - lsGet(K_AVISO) < CADA) return;
    if (ahora() - lsGet(K_ULT) < CADA) { lsSet(K_AVISO, ahora()); return; } // registró hace poco: no molesta
    mostrar();
  }

  setTimeout(revisar, 60 * 1000);
  setInterval(revisar, 5 * 60 * 1000);
  window.recordatorioTandas = mostrar;
})();
