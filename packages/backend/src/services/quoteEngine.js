/**
 * PrintOS — Motor de Cotización
 *
 * Lógica pura: recibe datos de DB ya resueltos y calcula costos.
 * No hace queries directamente — eso es responsabilidad del route.
 */

/**
 * Calcula el costo de un ítem individual.
 *
 * @param {object} params
 * @param {object} params.material       - { price_per_unit, unit }
 * @param {object} params.process        - { pricing_mode, cost_per_hour, labor_rate, price_per_unit }
 * @param {object[]} params.finishings   - [{ cost_per_unit }]
 * @param {number} params.quantity
 * @param {number} [params.width_cm]     - Ancho en cm (para m2)
 * @param {number} [params.height_cm]    - Alto en cm (para m2)
 * @param {number} [params.machine_hours] - Horas máquina (solo modo 'hourly')
 * @returns {object} breakdown del ítem
 */
function calculateItem({ material, process, finishings, quantity, width_cm, height_cm, machine_hours }) {
  // ── Material ──────────────────────────────────────────────────────────────
  let area_m2 = null;
  let material_cost = 0;

  if (material.unit === 'm2' && width_cm && height_cm) {
    area_m2 = (parseFloat(width_cm) * parseFloat(height_cm)) / 10000;
    material_cost = parseFloat(material.price_per_unit) * area_m2 * quantity;
  } else if (material.unit === 'metro_lineal' && (width_cm || height_cm)) {
    const metros = parseFloat(width_cm || height_cm) / 100;
    material_cost = parseFloat(material.price_per_unit) * metros * quantity;
  } else {
    material_cost = parseFloat(material.price_per_unit) * quantity;
  }

  // ── Proceso (hourly vs per_unit) ──────────────────────────────────────────
  let process_cost = 0;
  let labor_cost   = 0;

  if (process.pricing_mode === 'per_unit') {
    process_cost = parseFloat(process.price_per_unit || 0) * quantity;
    labor_cost   = 0;
  } else {
    // hourly (default)
    const hours  = parseFloat(machine_hours || 0);
    process_cost = parseFloat(process.cost_per_hour || 0) * hours * quantity;
    labor_cost   = parseFloat(process.labor_rate   || 0) * hours * quantity;
  }

  // ── Acabados ──────────────────────────────────────────────────────────────
  const finishing_cost = finishings.reduce((sum, f) => {
    return sum + parseFloat(f.cost_per_unit) * quantity;
  }, 0);

  const subtotal = material_cost + process_cost + labor_cost + finishing_cost;

  return {
    area_m2:        area_m2 ? round(area_m2, 4) : null,
    material_cost:  round(material_cost,  4),
    process_cost:   round(process_cost,   4),
    labor_cost:     round(labor_cost,     4),
    finishing_cost: round(finishing_cost, 4),
    subtotal:       round(subtotal, 2),
  };
}

/**
 * Calcula una cotización completa.
 *
 * @param {object[]} resolvedItems - Ítems con materiales, procesos y acabados ya cargados de DB
 * @param {number} exchangeRate    - Tasa de cambio VES
 * @param {string} currency        - 'USD' | 'EUR'
 * @returns {object} resultado final con breakdown
 */
function calculateQuote(resolvedItems, exchangeRate, currency) {
  const itemResults = resolvedItems.map((item, idx) => {
    const breakdown = calculateItem(item);
    return {
      index:    idx,
      material: item.material.name,
      process:  item.process.name,
      quantity: item.quantity,
      ...breakdown,
    };
  });

  const subtotal  = itemResults.reduce((sum, i) => sum + i.subtotal, 0);
  const total_ves = round(subtotal * parseFloat(exchangeRate), 2);

  return {
    currency,
    items:               itemResults,
    subtotal:            round(subtotal, 2),
    total_ves,
    exchange_rate_used:  parseFloat(exchangeRate),
  };
}

function round(value, decimals) {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

module.exports = { calculateItem, calculateQuote };
