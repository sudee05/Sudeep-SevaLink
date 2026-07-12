import { ArrowUpRight } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function StatCard({ label, value, delta, icon: Icon }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-primary" />}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {delta && (
        <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
          <ArrowUpRight className="h-3 w-3" /> {delta}
        </p>
      )}
    </Card>
  )
}
