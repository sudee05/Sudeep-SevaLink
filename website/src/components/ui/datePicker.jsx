import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { cn } from '@/lib/utils'
import 'react-day-picker/dist/style.css'

export function DatePicker({ value, onChange, min, placeholder = 'Select date' }) {
  const [open, setOpen] = useState(false)
  const selectedDate = value ? new Date(value + 'T00:00:00') : undefined
  const minDate = min ? new Date(min + 'T00:00:00') : undefined

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20',
          !selectedDate && 'text-muted-foreground',
        )}
      >
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        {selectedDate ? format(selectedDate, 'PPP') : placeholder}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-2 rounded-xl border border-border bg-card p-2 shadow-lg">
            <DayPicker
              mode="single"
              selected={selectedDate}
              disabled={minDate ? { before: minDate } : undefined}
              onSelect={(date) => {
                if (date) {
                  onChange(format(date, 'yyyy-MM-dd'))
                  setOpen(false)
                }
              }}
              classNames={{
                day_selected: 'bg-primary text-primary-foreground rounded-lg',
                day_today: 'font-bold text-primary',
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}