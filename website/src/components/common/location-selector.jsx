import { useEffect, useMemo, useState } from 'react'
import { Select } from '@/components/ui/select'
import { buildLocation, getCities, getDistricts, getStates, hasNoDistricts } from '@/utils/location-data'

function toOptions(values) {
  return values.map((value) => ({ label: value, value }))
}

function parseLocation(value) {
  const [state = '', district = '', city = ''] = String(value || '')
    .split(',')
    .map((part) => part.trim())

  return { state, district, city }
}

export function LocationSelector({ value = '', onChange, className = '', required = false }) {
  const initial = parseLocation(value)
  const [state, setState] = useState(initial.state)
  const [district, setDistrict] = useState(initial.district)
  const [city, setCity] = useState(initial.city)

  const stateOptions = useMemo(() => toOptions(getStates()), [])

  /**
   * flatMode = the state's data is a plain city array (e.g. all Indian states).
   * In flat mode:
   *   - "district" dropdown is populated from that city array
   *   - "city" becomes a free-text <input> the user types manually
   */
  const flatMode = useMemo(() => hasNoDistricts(state), [state])

  // nested: real district names; flat: use the city list as district options
  const districtOptions = useMemo(() => {
    if (!state) return []
    return flatMode
      ? toOptions(getCities(state, ''))   // flat: city array → district dropdown
      : toOptions(getDistricts(state))    // nested: real district names
  }, [flatMode, state])

  // nested: cities filtered by district; flat: no city dropdown (user types)
  const cityOptions = useMemo(
    () => toOptions(getDistricts(state) ? getCities(state, district) : []),
    [district, state]
  )

  useEffect(() => {
    const next = parseLocation(value)
    setState(next.state)
    setDistrict(next.district)
    setCity(next.city)
  }, [value])

  function emit(nextState, nextDistrict, nextCity) {
    onChange?.(buildLocation(nextState, nextDistrict, nextCity), {
      state: nextState,
      district: nextDistrict,
      city: nextCity,
    })
  }

  function handleStateChange(nextState) {
    setState(nextState)
    setDistrict('')
    setCity('')
    emit(nextState, '', '')
  }

  function handleDistrictChange(nextDistrict) {
    setDistrict(nextDistrict)
    setCity('')
    emit(state, nextDistrict, '')
  }

  return (
    <div className={className}>
      <div className="grid gap-3 md:grid-cols-3">
        {/* State */}
        <Select
          required={required}
          value={state}
          onChange={(event) => handleStateChange(event.target.value)}
          options={stateOptions}
          placeholder="Select state"
        />

        {/* District — in flat mode this shows the city list as district options */}
        <Select
          required={required}
          value={district}
          onChange={(event) => handleDistrictChange(event.target.value)}
          options={districtOptions}
          placeholder="Select district"
          disabled={!state}
        />

        {/* City — free-text input in flat mode, dropdown in nested mode */}
        {flatMode ? (
          <input
            required={required}
            value={city}
            onChange={(event) => {
              setCity(event.target.value)
              emit(state, district, event.target.value)
            }}
            placeholder="Enter your city"
            disabled={!district}
            className="h-11 w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          />
        ) : (
          <Select
            required={required}
            value={city}
            onChange={(event) => {
              setCity(event.target.value)
              emit(state, district, event.target.value)
            }}
            options={cityOptions}
            placeholder="Select city"
            disabled={!district}
          />
        )}
      </div>
    </div>
  )
}
