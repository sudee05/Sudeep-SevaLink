import { cn } from '@/lib/utils'

export function Input({ className, type, ...props }) {
  const isDateOrTime = type === 'date' || type === 'time'

  return (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20',
        isDateOrTime && 'cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100',
        className,
      )}
      {...props}
    />
  )
}
