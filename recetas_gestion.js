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
    try { map = await sbSelect('produccion_mapeo', '?select=receta_id&sector=eq.' + sector) || []; } catch (e) { map = []; }
    var yaVinculada = {}; map.forEach(function (m) { if (m.receta_id) yaVinculada[m.receta_id] = 1; });   // ya tiene su receta propia en el sector
    if (!Array.isArray(rows) || !rows.length || typeof recipes === 'undefined') return;
    var propias = recipes.filter(function (r) { return !r.gestion; });
    var tengo = {}; propias.forEach(function (r) { tengo[norm(r.name)] = 1; });
    var nuevas = [];
    rows.forEach(function (g, i) {
      var nom = String(g.nombre || '').trim().replace(/\s+/g, ' ');
      if (!nom || yaVinculada[g.id] || /\bproyecto\b|reventa|\bprueba\b|nativo|mayorista/i.test(nom)) return;
      var k = norm(nom); if (!k || tengo[k] || (saltear && saltear.test(k))) return; tengo[k] = 1;
      var rend = +g.rendimiento || 1, ut = +g.unidades_tanda || 0, fac = ut > 0 ? ut / rend : 1, rinde = ut > 0 ? ut : rend;
      var kg = String(g.unidad_venta || '').toLowerCase() === 'kg';
      var ings = (g.ingredientes || []).map(function (x) {
        var q = (+x.cantidad || 0) * fac; if (!(q > 0)) return null;
        return cant(q, x.unidad) + ' ' + (/^rec/i.test(x.unidad || '') ? (x.nombre || '') : limpiar(x.nombre));
      }).filter(Boolean);
      if (!ings.length) return;
      nuevas.push({ id: 900000 + i, gestion: true, name: nom.charAt(0).toUpperCase() + nom.slice(1), ingredients: ings,
        steps: Array.isArray(g.pasos) ? g.pasos.filter(function (p) { return p && String(p).trim(); }) : [],
        rendimiento: rinde + (kg ? ' kg' : ' unidades') + (ut > 0 ? ' por tanda' : ''), deposito: 'local', cookTime: null });
    });
    recipes.length = 0; propias.concat(nuevas).forEach(function (r) { recipes.push(r); });
    if (nuevas.length && typeof renderRecipes === 'function') renderRecipes();
  };
})();
