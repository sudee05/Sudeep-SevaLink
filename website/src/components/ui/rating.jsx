import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Rating({ value = 5, max = 5, className }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {Array.from({ length: max }).map((_, idx) => {
        const active = idx + 1 <= value
        return (
          <Star
            key={idx}
            className={cn('h-4 w-4', active ? 'fill-amber-400 text-amber-400' : 'text-slate-300')}
          />
        )
      })}
    </div>
  )
}
