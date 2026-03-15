/**
 * Business ID Utilities — Centralized normalization
 *
 * Ensures consistent business ID matching regardless of how
 * they were stored (ml-parts, mlparts, ML Parts, ml_parts, etc.)
 */

/**
 * Normalize a business ID for comparison.
 * Strips dashes, underscores, spaces; lowercases.
 * "ML Parts" → "mlparts", "ml-parts" → "mlparts", "rush_ride" → "rushride"
 */
export function normBiz(id) {
  return (id || '').toLowerCase().replace(/[-_\s.]/g, '');
}

/**
 * Check if two business IDs match (flexible).
 * bizMatch('ml-parts', 'mlparts') → true
 * bizMatch('Rush Ride', 'rush-ride') → true
 */
export function bizMatch(a, b) {
  return normBiz(a) === normBiz(b);
}

/**
 * Check if a business ID exists in an array (flexible).
 * bizIncludes(['mlparts', 'xazai'], 'ml-parts') → true
 */
export function bizIncludes(arr, id) {
  if (!arr || !Array.isArray(arr)) return false;
  const norm = normBiz(id);
  return arr.some(item => normBiz(item) === norm);
}
