import { stateObject } from '../../Country+State+District-City-Data'

const INDIA = stateObject?.India || {}

function cleanList(values = []) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
}

/** Returns true when the state maps directly to a city array (flat format) */
function isFlatState(state) {
  return Array.isArray(INDIA[state])
}

export function getStates() {
  return cleanList(Object.keys(INDIA))
}

/**
 * Returns district names for a state.
 * If the state uses the flat format (array of cities), returns [] because
 * there are no districts — cities are accessed directly via getCities.
 */
export function getDistricts(state) {
  if (!state || !INDIA[state]) return []
  if (isFlatState(state)) return [] // flat: no district level
  return cleanList(Object.keys(INDIA[state]))
}

/**
 * Returns cities.
 * - Nested format: state → { district → [cities] }
 * - Flat format:   state → [cities]  (district param is ignored / can be '')
 */
export function getCities(state, district) {
  if (!state || !INDIA[state]) return []
  if (isFlatState(state)) return cleanList(INDIA[state])
  if (!district || !INDIA[state]?.[district]) return []
  return cleanList(INDIA[state][district])
}

/** Returns true when the selected state has no district level */
export function hasNoDistricts(state) {
  if (!state || !INDIA[state]) return false
  return isFlatState(state)
}

export function buildLocation(state, district, city) {
  return [state, district, city].map((part) => String(part || '').trim()).filter(Boolean).join(', ')
}
