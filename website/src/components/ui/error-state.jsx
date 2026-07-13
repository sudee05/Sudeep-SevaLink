import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again in a few seconds.',
  onRetry,
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
        <AlertTriangle className="h-5 w-5 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      <Button onClick={onRetry}>Retry</Button>
    </Card>
  )
}
