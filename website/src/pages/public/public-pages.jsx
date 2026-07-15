import { motion } from 'framer-motion'
import { Link, useParams } from 'react-router-dom'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useCategoriesQuery, useProviderQuery, useProvidersQuery, useServiceQuery, useServicesQuery } from '@/hooks/use-queries'
import { mockFaqs, mockTestimonials, landingStats } from '@/data/mockData'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ServiceCard } from '@/components/common/service-card'
import { ProviderCard } from '@/components/common/provider-card'
import { SectionHeader } from '@/components/common/section-header'
import { LoadingGrid } from '@/components/ui/loading-grid'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Badge } from '@/components/ui/badge'

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
}

export function LandingPage() {
  const categories = useCategoriesQuery()
  const services = useServicesQuery()
  const providers = useProvidersQuery()

  return (
    <motion.div className="space-y-16" {...fade}>
      <section className="grid gap-8 rounded-3xl border border-border bg-card p-6 shadow-lg lg:grid-cols-2 lg:p-10">
        <div className="space-y-6">
          <Badge>Trusted by 1.9M households</Badge>
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Book premium home services in minutes.</h1>
          <p className="text-muted-foreground">SevaLink connects customers with verified experts for cleaning, repairs, beauty, and business support.</p>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_140px]">
            <Input placeholder="Search services, providers..." />
            <Select options={[{ label: 'Bengaluru', value: 'blr' }, { label: 'Mumbai', value: 'mum' }]} placeholder="Location" />
            <Button>
              <Search className="h-4 w-4" /> Search
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {landingStats.map((stat) => (
              <Card key={stat.label} className="p-3">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </Card>
            ))}
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl">
          <img
            src="https://images.unsplash.com/photo-1521790797524-b2497295b8a0?auto=format&fit=crop&w=1400&q=80"
            alt="SevaLink hero"
            className="h-full min-h-[360px] w-full object-cover"
          />
        </div>
      </section>

      <section>
        <SectionHeader title="Popular Categories" subtitle="From essentials to premium plans." action={<Link to="/categories"><Button variant="outline">View all</Button></Link>} />
        {categories.isLoading ? <LoadingGrid count={6} /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.data?.map((category) => {
              const Icon = category.icon
              return (
                <Card key={category.id} className="group transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="mb-4 inline-flex rounded-2xl bg-muted p-3">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{category.services}+ services available</p>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Featured Services" subtitle="Best rated services near you." action={<Link to="/services"><Button variant="outline">Browse services</Button></Link>} />
        {services.isLoading ? <LoadingGrid /> : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {services.data?.slice(0, 6).map((service) => <ServiceCard key={service.id} service={service} />)}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Featured Providers" subtitle="Verified professionals with top reviews." action={<Link to="/providers"><Button variant="outline">See providers</Button></Link>} />
        {providers.isLoading ? <LoadingGrid /> : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {providers.data?.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {['Choose Service', 'Book Slot', 'Get It Done'].map((step, idx) => (
          <Card key={step}>
            <p className="mb-2 text-xs font-semibold text-primary">Step {idx + 1}</p>
            <h3 className="font-semibold">{step}</h3>
            <p className="text-sm text-muted-foreground">Transparent pricing, trusted providers, and live booking timeline.</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {mockTestimonials.map((item) => (
          <Card key={item.id} className="space-y-3">
            <p className="text-sm text-muted-foreground">"{item.quote}"</p>
            <div>
              <p className="font-semibold">{item.author}</p>
              <p className="text-xs text-muted-foreground">{item.role}</p>
            </div>
          </Card>
        ))}
      </section>

      <section>
        <SectionHeader title="FAQ" subtitle="Quick answers before your first booking." />
        <div className="space-y-3">
          {mockFaqs.map((faq) => (
            <Card key={faq.q}>
              <h4 className="font-semibold">{faq.q}</h4>
              <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
            </Card>
          ))}
        </div>
      </section>
    </motion.div>
  )
}

export function CategoriesPage() {
  const { data, isLoading } = useCategoriesQuery()

  if (isLoading) return <LoadingGrid count={6} />

  return (
    <motion.div {...fade}>
      <SectionHeader title="Service Categories" subtitle="Find by home, business, and lifestyle needs." />
      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <Input placeholder="Search categories" />
        <Select placeholder="Popularity" options={[{ label: 'Most booked', value: 'booked' }]} />
        <Select placeholder="City" options={[{ label: 'All cities', value: 'all' }]} />
        <Button variant="outline"><SlidersHorizontal className="h-4 w-4" /> More Filters</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((category) => {
          const Icon = category.icon
          return (
            <Card key={category.id} className="space-y-3">
              <div className="inline-flex rounded-xl bg-muted p-3"><Icon className="h-5 w-5 text-primary" /></div>
              <h3 className="font-semibold">{category.name}</h3>
              <p className="text-sm text-muted-foreground">{category.services}+ services</p>
            </Card>
          )
        })}
      </div>
    </motion.div>
  )
}

export function ServicesPage() {
  const { data, isLoading } = useServicesQuery()

  return (
    <motion.div {...fade}>
      <SectionHeader title="Services" subtitle="Browse service types available on SevaLink." />
      <div className="mb-5 grid gap-3 lg:grid-cols-4">
        <Input className="lg:col-span-2" placeholder="Search services" />
        <Select placeholder="Category" options={[{ label: 'All', value: 'all' }]} />
        <Select placeholder="Location" options={[{ label: 'All', value: 'all' }]} />
      </div>
      {isLoading ? <LoadingGrid /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data?.map((service) => <ServiceCard key={service.id} service={service} />)}
        </div>
      )}
    </motion.div>
  )
}

export function ProvidersPage() {
  const { data, isLoading } = useProvidersQuery()

  return (
    <motion.div {...fade}>
      <SectionHeader title="Service Providers" subtitle="Browse provider profiles, ratings, certificates and recent work." />
      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <Input placeholder="Search providers" />
        <Select placeholder="Speciality" options={[{ label: 'All', value: 'all' }]} />
        <Select placeholder="Experience" options={[{ label: '3+ years', value: '3' }]} />
        <Select placeholder="Sort" options={[{ label: 'Top rated', value: 'rating' }]} />
      </div>
      {isLoading ? <LoadingGrid /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data?.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}
        </div>
      )}
    </motion.div>
  )
}

export function ServiceDetailsPage() {
  const { id } = useParams()
  const { data, isLoading, isError } = useServiceQuery(id)

  if (isLoading) return <LoadingGrid count={1} />
  if (isError || !data) return <ErrorState />

  return (
    <motion.div className="space-y-6" {...fade}>
      <Card className="space-y-4">
        <Badge>Service</Badge>
        <h1 className="text-2xl font-bold">{data.name}</h1>
        <p className="text-muted-foreground">{data.description || 'Service details will be added soon.'}</p>
        <Link to="/customer/booking/new"><Button>Book Now</Button></Link>
      </Card>
    </motion.div>
  )
}

export function ProviderDetailsPage() {
  const { id } = useParams()
  const { data, isLoading } = useProviderQuery(id)

  if (isLoading) return <LoadingGrid count={1} />
  if (!data) return <EmptyState title="Provider not found" />

  return (
    <motion.div className="space-y-6" {...fade}>
      <Card className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <img src={data.image} alt={data.name} className="h-52 w-full rounded-2xl object-cover" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{data.name}</h1>
            {data.verified && <Badge variant="success">Verified</Badge>}
          </div>
          <p className="mt-1 text-muted-foreground">{data.category} • {data.location}</p>
          <p className="mt-4 text-sm text-muted-foreground">{data.about}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.certificates.map((certificate) => <Badge key={certificate} variant="outline">{certificate}</Badge>)}
          </div>
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">Business Information</h3>
          <p className="text-sm text-muted-foreground">Experience: {data.experience}</p>
          <p className="text-sm text-muted-foreground">Completed Jobs: {data.jobs}+</p>
          <p className="text-sm text-muted-foreground">Rating: {data.rating}/5</p>
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold">Contact</h3>
          <p className="text-sm text-muted-foreground">support@sevalink-provider.app</p>
          <p className="text-sm text-muted-foreground">+91 98888 44556</p>
          <Button className="mt-4">Request Callback</Button>
        </Card>
      </div>
    </motion.div>
  )
}

export function SearchPage() {
  const { data, isLoading } = useServicesQuery()

  if (isLoading) return <LoadingGrid />

  return (
    <motion.div className="space-y-5" {...fade}>
      <SectionHeader title="Search Services" subtitle="Use advanced filters and smart suggestions." />
      <Card className="grid gap-3 lg:grid-cols-6">
        <Input className="lg:col-span-2" placeholder="What service are you looking for?" />
        <Select placeholder="Category" options={[{ label: 'All', value: 'all' }]} />
        <Select placeholder="Location" options={[{ label: 'All', value: 'all' }]} />
        <Select placeholder="Price" options={[{ label: 'Under ₹1500', value: '1500' }]} />
        <Select placeholder="Sort" options={[{ label: 'Recommended', value: 'rec' }]} />
      </Card>
      {data?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((service) => <ServiceCard key={service.id} service={service} />)}
        </div>
      ) : (
        <EmptyState title="No services found" description="Try changing filters or location." />
      )}
    </motion.div>
  )
}
