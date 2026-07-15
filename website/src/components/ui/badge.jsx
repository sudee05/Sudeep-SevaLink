import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', {
  variants: {
    variant: {
      default: 'bg-primary/10 text-primary',
      secondary: 'bg-secondary/10 text-secondary',
      success: 'border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-200 dark:bg-emerald-100 dark:text-emerald-700',
      warning: 'border border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-200 dark:bg-amber-100 dark:text-amber-800',
      danger: 'border border-red-200 bg-red-100 text-red-700 dark:border-red-200 dark:bg-red-100 dark:text-red-700',
      outline: 'border border-border text-foreground',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
