import { useState } from 'react'
import { Clock } from 'lucide-react'
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
  const slots = generateSlots(step)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20',
          !value && 'text-muted-foreground',
        )}
      >
        <Clock className="h-4 w-4 text-muted-foreground" />
        {value ? formatLabel(value) : placeholder}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg">
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => {
                  onChange(slot)
                  setOpen(false)
                }}
                className={cn(
                  'w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-primary/10',
                  value === slot && 'bg-primary text-primary-foreground hover:bg-primary',
                )}
              >
                {formatLabel(slot)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}