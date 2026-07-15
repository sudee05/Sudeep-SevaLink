import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'

export function ServiceCard({ service }) {
  return (
    <Card className="group flex min-h-44 flex-col justify-between transition hover:-translate-y-1 hover:shadow-lg">
      <div className="space-y-2">
        <h3 className="line-clamp-2 text-base font-semibold">{service.name}</h3>
        <p className="line-clamp-4 text-sm text-muted-foreground">{service.description || 'Service details will be added soon.'}</p>
      </div>
      <div className="pt-4">
        <Link to={`/service/${service.id}`} className="text-sm font-semibold text-primary hover:underline">
          View details
        </Link>
      </div>
    </Card>
  )
}
