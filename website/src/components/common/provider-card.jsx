import { Link } from 'react-router-dom'
import { MapPin, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export function ProviderCard({ provider }) {
  const providerName = provider.name || provider.business_name || 'Provider'
  const servicesLabel = provider.services_label || provider.service_names?.join(', ') || 'Services not selected'

  return (
    <Card className="group space-y-4 transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center gap-3">
        <img src={provider.image} alt={providerName} className="h-14 w-14 rounded-xl object-cover" />
        <div>
          <h3 className="font-semibold">{providerName}</h3>
          <p className="text-sm text-muted-foreground">{servicesLabel}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{provider.rating} rating</Badge>
        <Badge variant="outline">{provider.jobs}+ jobs</Badge>
        {provider.verified && (
          <Badge variant="success">
            <ShieldCheck className="mr-1 h-3 w-3" /> Verified
          </Badge>
        )}
      </div>
      <p className="line-clamp-2 text-sm text-muted-foreground">{provider.about}</p>
      <div className="flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-4 w-4" /> {provider.location}
        </span>
        <Link to={`/provider/${provider.id}`} className="font-semibold text-primary hover:underline">
          Profile
        </Link>
      </div>
    </Card>
  )
}
