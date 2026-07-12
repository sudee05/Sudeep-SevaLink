import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Rating } from '@/components/ui/rating'
import { formatCurrency } from '@/utils/format'

export function ServiceCard({ service }) {
  return (
    <Card className="group overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-lg">
      <div className="h-44 overflow-hidden">
        <img src={service.image} alt={service.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline">{service.category}</Badge>
          {service.verified && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary">
              <ShieldCheck className="h-3 w-3" /> Verified
            </span>
          )}
        </div>
        <h3 className="line-clamp-2 text-base font-semibold">{service.title}</h3>
        <div className="flex items-center justify-between">
          <Rating value={service.rating} />
          <p className="text-xs text-muted-foreground">{service.reviews} reviews</p>
        </div>
        <div className="flex items-center justify-between pt-1">
          <p className="text-lg font-bold text-primary">{formatCurrency(service.price)}</p>
          <Link to={`/service/${service.id}`} className="text-sm font-semibold text-primary hover:underline">
            View details
          </Link>
        </div>
      </div>
    </Card>
  )
}
