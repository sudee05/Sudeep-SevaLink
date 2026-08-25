import { useEffect, useRef, useState } from 'react'
import { Clock, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

function generateSlots(step = 30) {
  const slots = []
  for (let m = 0; m < 24 * 60; m += step) {
    const h = String(Math.floor(m / 60)).padStart(2, '0')
    const mm = String(m % 60).padStart(2, '0')
    slots.push(`${h}:${mm}`)
  }
  return slots
}

function formatLabel(value) {
  const [h, m] = value.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

export function TimePicker({ value, onChange, step = 30, placeholder = 'Select time' }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const listRef = useRef(null)
  const slots = generateSlots(step)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  // Scroll selected slot into view when dropdown opens
  useEffect(() => {
    if (!open || !listRef.current || !value) return
    const selectedEl = listRef.current.querySelector('[data-selected="true"]')
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' })
    }
  }, [open, value])

  function handleSelect(slot) {
    onChange(slot)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm outline-none transition-all',
          'hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20',
          open && 'border-primary ring-2 ring-primary/20',
          !value && 'text-muted-foreground',
        )}
      >
        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-left">{value ? formatLabel(value) : placeholder}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg shadow-black/10 ring-1 ring-black/5"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div className="p-1">
            {slots.map((slot) => {
              const isSelected = value === slot
              return (
                <button
                  key={slot}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-selected={isSelected}
                  onClick={() => handleSelect(slot)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted text-foreground',
                  )}
                >
                  {formatLabel(slot)}
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}