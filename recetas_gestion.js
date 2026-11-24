/* Recetas cargadas en Gestión (tabla recetas) que se muestran también en el recetario de un sector.
   Así una receta que se carga en Gestión aparece sola en Pastelería / Cocina, sin repetir las que ya están.
   Uso: cargarRecetasGestionSector('pasteleria', /^(…)$/) después del primer renderRecipes(). */
(function () {
  function norm(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\b(de|del|la|el|con|y|para)\b/g, ' ')
      .replace(/s\b/g, '').replace(/\s+/g, ' ').trim();
  }
  function limpiar(n) {
    return String(n || '').replace(/\s+/g, ' ').replace(/\bx\s*\d+[\d.,]*\s*(kg|gr|g|k|lt|l|u|unid\w*)\b.*$/i, '')
      .replace(/\b\d+[\d.,]*\s*(kg|gr|g)\b\s*$/i, '').trim().toLowerCase().replace(/^./, function (c) { return c.toUpperCase(); });
  }
  function cant(q, u) {
    u = String(u || '').toLowerCase();
    function f(x, d) { return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toLocaleString('es-AR'); }
    if (/^k/.test(u)) return q < 1 ? f(q * 1000, q * 1000 < 10 ? 1 : 0) + 'g' : f(q, 2) + 'kg';
    if (/^g/.test(u)) return f(q, 1) + 'g';
    if (/^l/.test(u)) return q < 1 ? f(q * 1000, 0) + 'cc' : f(q, 2) + ' litros';
    if (/^(cc|ml)/.test(u)) return f(q, 0) + 'cc';
    if (/^u/.test(u)) return f(q, 1) + ' u';
    if (/^rec/.test(u)) return f(q, 2) + ' tanda' + (q === 1 ? '' : 's') + ' de';
    return f(q, 2) + ' ' + u;
  }
  window.esRecetaGestion = function (r) { return !!(r && r.gestion); };
  window.cargarRecetasGestionSector = async function (sector, saltear) {
    var rows;
    var map = [];
    try { rows = await sbSelect('recetas', '?select=id,nombre,rendimiento,unidades_tanda,unidad_venta,ingredientes,pasos&sector=eq.' + sector + '&tipo=in.(PRODUCCION,BASE)&order=nombre.asc'); } catch (e) { return; }
    try { map = await sbSelect('produccion_mapeo', '?select=producto,receta_id&sector=eq.' + sector) || []; } catch (e) { map = []; }
    var yaVinculada = {}; map.forEach(function (m) { if (m.receta_id) yaVinculada[m.receta_id] = 1; });   // ya tiene su receta propia en el sector
    if (!Array.isArray(rows) || !rows.length || typeof recipes === 'undefined') return;
    // Las recetas de Gestión mandan: lo que se corrige en Gestión reemplaza los ingredientes y pasos
    // de la copia vieja que trae el sector (antes solo se sumaban las que no existían y los cambios no impactaban).
    function lineas(g) {
      var rend = +g.rendimiento || 1, ut = +g.unidades_tanda || 0, fac = ut > 0 ? ut / rend : 1;
      return (g.ingredientes || []).map(function (x) {
        var q = (+x.cantidad || 0) * fac; if (!(q > 0)) return null;
        var nomX = String(x.nombre || '');
        if (/^rec/i.test(x.unidad || '')) {
          if (/^relleno/i.test(nomX)) return cant(q, 'kg') + ' ' + nomX;          // rellenos se miden en kg
          if (/^tapas? /i.test(nomX)) return cant(q, 'u') + ' ' + nomX;            // tapas por unidad
          return cant(q, x.unidad) + ' ' + nomX;
        }
        return cant(q, x.unidad) + ' ' + limpiar(nomX);
      }).filter(Boolean);
    }
    var porId = {}; rows.forEach(function (g) { porId[g.id] = g; });
    var porNombre = {}; rows.forEach(function (g) { var k = norm(g.nombre); if (k && !porNombre[k]) porNombre[k] = g; });
    var porProducto = {}; map.forEach(function (m) { if (m.receta_id && porId[m.receta_id]) porProducto[norm(m.producto)] = porId[m.receta_id]; });
    var cambio = false;
    var REEMPLAZA = { cocina: 1 };   // sectores donde Gestión reemplaza la receta vieja del sector
    if (REEMPLAZA[sector]) recipes.forEach(function (r) {
      if (r.gestion) return;
      var g = porProducto[norm(r.name)] || porNombre[norm(r.name)]; if (!g) return;
      var ings = lineas(g); if (!ings.length) return;
      var porUnidad = !(+g.unidades_tanda > 0) && (+g.rendimiento || 1) === 1;
      if (!r._rendOriginal) r._rendOriginal = r.rendimiento || '';
      r.ingredients = ings;
      var pasos = Array.isArray(g.pasos) ? g.pasos.filter(function (p) { return p && String(p).trim(); }) : [];
      if (pasos.length) r.steps = pasos;
      r.rendimiento = porUnidad ? 'Por unidad' + (r._rendOriginal ? ' · ' + r._rendOriginal : '') : r._rendOriginal;
      r.deGestion = true; cambio = true;
    });
    var propias = recipes.filter(function (r) { return !r.gestion; });
    var tengo = {}; propias.forEach(function (r) { tengo[norm(r.name)] = 1; });
    var nuevas = [];
    rows.forEach(function (g, i) {
      var nom = String(g.nombre || '').trim().replace(/\s+/g, ' ');
      if (!nom || yaVinculada[g.id] || /\bproyecto\b|reventa|\bprueba\b|nativo|mayorista/i.test(nom)) return;
      var k = norm(nom); if (!k || tengo[k] || (saltear && saltear.test(k))) return; tengo[k] = 1;
      var rend = +g.rendimiento || 1, ut = +g.unidades_tanda || 0, rinde = ut > 0 ? ut : rend;
      var kg = String(g.unidad_venta || '').toLowerCase() === 'kg';
      var ings = lineas(g);
      if (!ings.length) return;
      nuevas.push({ id: 900000 + i, gestion: true, name: nom.charAt(0).toUpperCase() + nom.slice(1), ingredients: ings,
        steps: Array.isArray(g.pasos) ? g.pasos.filter(function (p) { return p && String(p).trim(); }) : [],
        rendimiento: rinde + (kg ? ' kg' : ' unidades') + (ut > 0 ? ' por tanda' : ''), deposito: 'local', cookTime: null });
    });
    recipes.length = 0; propias.concat(nuevas).forEach(function (r) { recipes.push(r); });
    if ((nuevas.length || cambio) && typeof renderRecipes === 'function') renderRecipes();
  };
})();
