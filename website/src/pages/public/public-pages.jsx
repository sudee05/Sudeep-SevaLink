import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Handshake,
  MoveRight,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
} from 'lucide-react'
import { useCategoriesQuery, useProviderQuery, useProvidersQuery, useServiceQuery, useServicesQuery } from '@/hooks/use-queries'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ServiceCard } from '@/components/common/service-card'
import { ProviderCard } from '@/components/common/provider-card'
import { LocationSelector } from '@/components/common/location-selector'
import { SectionHeader } from '@/components/common/section-header'
import { LoadingGrid } from '@/components/ui/loading-grid'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Badge } from '@/components/ui/badge'
import heroConsultation from '@/assets/landing-hero-consultation.png'
import missionPortrait from '@/assets/uncle.jpg'
import cleaningImage from '@/assets/cleaning.jpg'
import logisticsImage from '@/assets/logistics.jpg'
import counselingImage from '@/assets/talling aunties.jpg'
import providerGrowthImage from '@/assets/cyber_security.jpg'
import nurseImage from '@/assets/nursing.jpg'
import relocationImage from '@/assets/relocation.jpg'
import markImage from '@/assets/mark.jpg'
import zaraImage from '@/assets/zara.jpg'
import joyImage from '@/assets/joy.jpg'

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
}

const popularCategories = [
  {
    title: 'Home Maintenance',
    subtitle: '1.2k providers available',
    image: cleaningImage,
    className: 'md:col-span-2 md:row-span-2',
  },
  {
    title: 'Health & Wellness',
    subtitle: 'Yoga, nursing, therapy',
    image: counselingImage,
    className: 'md:col-span-2',
  },
  {
    title: 'Logistics',
    subtitle: 'Moving and storage',
    image: logisticsImage,
    className: '',
  },
]

const providerBenefits = [
  {
    icon: BriefcaseBusiness,
    title: 'Flexible schedule',
    text: 'Work when you want, where you want, and choose the jobs that match your strengths.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure payments',
    text: 'Get paid instantly upon job completion through our protected workflow.',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Business tools',
    text: 'Track bookings, customer repeat rate, and performance from one clean dashboard.',
  },
  {
    icon: BadgeCheck,
    title: 'Verified trust',
    text: 'Build credibility with verified reviews, badges, and quality milestones.',
  },
]

const featuredPros = [
  {
    title: 'Elite Deep Cleaning',
    rating: '4.9',
    price: '₹85.00',
    image: cleaningImage,
    text: 'Complete sanitation and organization for luxury homes and recurring care.',
  },
  {
    title: 'In-Home Nursing',
    rating: '5.0',
    price: '₹820.00',
    image: nurseImage,
    text: 'Specialized home care for recovery, elder support, and daily comfort.',
  },
  {
    title: 'Premium Relocation',
    rating: '4.8',
    price: '₹2250.00',
    image: relocationImage,
    text: 'Full-service white glove moving for homes, offices, and delicate items.',
  },
  {
    title: 'IT & Cybersecurity',
    rating: '4.9',
    price: '₹395.00',
    image: providerGrowthImage,
    text: 'Home network audits, device protection, and professional troubleshooting.',
  },
]

const qualitySteps = [
  {
    icon: ShieldCheck,
    title: '1. Verification',
    text: 'Pros undergo deep vetting, skill checks, and identity review before they go live.',
  },
  {
    icon: MoveRight,
    title: '2. Matching',
    text: 'Our matching flow pairs local needs with the right skill set, rating, and availability.',
  },
  {
    icon: Handshake,
    title: '3. Collaboration',
    text: 'Customers and providers manage milestones, updates, and payments in one place.',
  },
]

export function LandingPage() {
  const [location, setLocation] = useState('')

  return (
    <motion.div className="public-marketing relative left-1/2 w-screen -translate-x-1/2 space-y-0 overflow-hidden bg-[#f6f8ff] text-slate-900 dark:bg-background dark:text-foreground" {...fade}>
      <section className="px-4 pb-18 pt-8 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.02fr_1fr] lg:items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Connecting skilled hands with local needs
            </div>
            <div className="space-y-4">
              <h1 className="max-w-xl text-4xl font-black leading-tight text-slate-950 lg:text-6xl">
                Quality Services
                <br />
                <span className="text-blue-700">Meet Empowered Pros.</span>
              </h1>
              <p className="max-w-lg text-base leading-7 text-slate-600">
                Whether you&apos;re looking for elite home care or seeking to grow your own service business,
                SevaLink is the bridge to excellence and professional freedom.
              </p>
            </div>
            <div className="grid gap-3 rounded-3xl border border-blue-100 bg-white p-3 shadow-[0_20px_60px_rgba(59,91,219,0.12)] sm:grid-cols-[1fr_1fr_146px]">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 px-4 py-3 text-slate-500">
                <Search className="h-4 w-4 text-blue-700" />
                <Input className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0" placeholder="Service needed" />
              </div>
              <div className="rounded-2xl border border-slate-100 px-1 py-1">
                <LocationSelector value={location} onChange={setLocation} />
              </div>
              <Link to="/register">
              <Button className="h-full rounded-2xl bg-blue-700 px-6 text-white hover:bg-blue-800">
                Get Started
              </Button>
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  {[zaraImage, joyImage, markImage].map((avatar) => (
                    <img key={avatar} src={avatar} alt="Trusted provider" className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm" />
                  ))}
                </div>
                <p className="text-sm text-slate-500">Trusted ecosystem</p>
              </div>
              <Link to="/register?type=provider" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800">
                Register your business
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-4xl border border-blue-100 bg-white p-2 shadow-[0_28px_80px_rgba(44,77,193,0.18)]">
              <img src={heroConsultation} alt="Professional consultation" className="h-80 w-full rounded-3xl object-cover sm:h-107.5 lg:h-130" />
            </div>
            <div className="absolute -bottom-5 left-5 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Dual Vetting</p>
                  <p className="text-xs text-slate-500">Verified pros and clients</p>
                </div>
              </div>
            </div>
            <div className="absolute right-3 top-24 rounded-2xl border border-orange-100 bg-white px-4 py-3 text-right shadow-lg">
              <p className="text-lg font-bold text-slate-950">+45%</p>
              <p className="text-xs text-slate-500">Provider revenue growth</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-18 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex h-full items-center justify-center rounded-[1.75rem] bg-blue-50 text-blue-700">
              <Users className="h-9 w-9" />
            </div>
            <div className="overflow-hidden rounded-[1.75rem]">
              <img src={missionPortrait} alt="Trusted senior professional" className="h-52 w-full object-cover" />
            </div>
            <div className="overflow-hidden rounded-[1.75rem]">
              <img src={heroConsultation} alt="Consultation at SevaLink" className="h-44 w-full object-cover" />
            </div>
            <div className="flex h-full items-center justify-center rounded-[1.75rem] bg-emerald-50 text-emerald-700">
              <Handshake className="h-9 w-9" />
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Our Mission</p>
              <h2 className="text-3xl font-black leading-tight text-slate-950 lg:text-5xl">
                Bridging the Gap
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              SevaLink was born from a simple observation: skilled professionals often struggle to find reliable
              clients, while people in need of help can&apos;t find quality they can trust.
            </p>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              We didn&apos;t just build a marketplace. We built an ecosystem that values integrity, skill, and mutual
              growth, turning every booking into an opportunity to strengthen communities.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="rounded-2xl border-0 bg-blue-50 p-4 shadow-none">
                <p className="text-2xl font-black text-blue-700">500+</p>
                <p className="text-sm text-slate-600">Local Cities</p>
              </Card>
              <Card className="rounded-2xl border-0 bg-emerald-50 p-4 shadow-none">
                <p className="text-2xl font-black text-emerald-700">98%</p>
                <p className="text-sm text-slate-600">Job Satisfaction</p>
              </Card>
              <Card className="rounded-2xl border-0 bg-slate-100 p-4 shadow-none">
                <p className="text-2xl font-black text-slate-900">24/7</p>
                <p className="text-sm text-slate-600">Human Support</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-18 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-black text-slate-950">Popular Categories</h2>
              <p className="mt-2 text-slate-500">Explore services or find your next business opportunity.</p>
            </div>
            <Link to="/categories" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid auto-rows-55 gap-4 md:grid-cols-4">
            {popularCategories.map((category) => (
              <article key={category.title} className={`group relative overflow-hidden rounded-[1.8rem] ${category.className}`}>
                <img src={category.image} alt={category.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <h3 className="text-xl font-bold">{category.title}</h3>
                  <p className="mt-1 text-sm text-white/80">{category.subtitle}</p>
                </div>
              </article>
            ))}
            <article className="flex flex-col justify-between rounded-[1.8rem] bg-blue-700 p-6 text-white shadow-[0_24px_50px_rgba(33,84,210,0.25)]">
              <div className="rounded-2xl bg-white/10 p-3 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black leading-tight">List your service</h3>
                <p className="text-sm text-blue-100">Open your own category today and start getting verified demand.</p>
              </div>
              <Link to="/register?type=provider">
                <Button className="rounded-2xl bg-white text-blue-700 hover:bg-blue-50">Join Now</Button>
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-[#272b36] px-4 py-18 text-white lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Grow with SevaLink
            </div>
            <h2 className="text-3xl font-black leading-tight lg:text-5xl">
              Turn Your Skills Into
              <br />
              <span className="text-emerald-300">Sustainable Growth</span>
            </h2>
            <p className="max-w-xl text-base leading-7 text-slate-300">
              Join our network of providers and take full control of your business. We provide the tools, trust, and
              visibility. You provide the talent.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              {providerBenefits.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="flex gap-3">
                    <div className="rounded-2xl bg-white/8 p-3 text-emerald-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{item.text}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <Link to="/register?type=provider">
              <Button className="rounded-2xl bg-emerald-400 px-8 text-slate-950 hover:bg-emerald-300">Join as a Pro</Button>
            </Link>
          </div>
          <div className="relative rounded-4xl border border-white/10 bg-white/6 p-4 shadow-2xl backdrop-blur-sm">
            <img src={providerGrowthImage} alt="Provider dashboard" className="h-105 w-full rounded-[1.6rem] object-cover" />
            <div className="absolute bottom-8 left-8 rounded-2xl bg-white px-4 py-3 text-slate-900 shadow-xl">
              <div className="flex items-center gap-3">
                <img src={markImage} alt="Mark Sterling" className="h-11 w-11 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-semibold">Mark Sterling</p>
                  <p className="text-xs text-slate-500">SevaLink helped me double my bookings in 3 months.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-18 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-black text-slate-950">Top-Rated Professionals</h2>
            <p className="mt-2 text-slate-500">Discover elite providers ready to assist you today and see the quality standard we uphold.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featuredPros.map((item) => (
              <article key={item.title} className="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.07)]">
                <img src={item.image} alt={item.title} className="h-48 w-full object-cover" />
                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-slate-950">{item.title}</h3>
                    <div className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      {item.rating}
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-slate-500">{item.text}</p>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Starts from</p>
                      <p className="text-xl font-black text-slate-950">{item.price}</p>
                    </div>
                    <Link to="/login">
                    <Button variant="outline" className="rounded-2xl border-blue-200 text-blue-700 hover:bg-blue-50">
                      Book Now
                    </Button>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-18 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.2fr] lg:items-start">
          <div className="space-y-5">
            <h2 className="text-3xl font-black leading-tight text-slate-950">
              How SevaLink
              <br />
              <span className="text-blue-700">Ensures Quality</span>
            </h2>
            <p className="max-w-md text-base leading-7 text-slate-500">
              A streamlined path for both customers seeking help and trusted providers offering skills.
            </p>
            <Card className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-none">
              <div className="mb-3 inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-950">Trust Guarantee</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Every booking is protected by our service quality checks and support-backed resolution flow.
              </p>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {qualitySteps.map((step) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="space-y-4 rounded-[1.6rem] bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.07)]">
                  <div className="inline-flex rounded-2xl bg-blue-700 p-3 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-950">{step.title}</h3>
                  <p className="text-sm leading-6 text-slate-500">{step.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="px-4 pb-18 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2.25rem] bg-blue-700 px-6 py-14 text-center text-white shadow-[0_30px_80px_rgba(32,77,201,0.28)] lg:px-16">
          <h2 className="text-3xl font-black leading-tight lg:text-5xl">The Future of Service Excellence is Here</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-blue-100">
            Whether you&apos;re looking to hire or looking to be hired, SevaLink is the ecosystem built for you.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/services">
              <Button className="rounded-2xl bg-white px-8 text-blue-700 hover:bg-blue-50">Start Booking</Button>
            </Link>
            <Link to="/register?type=provider">
              <Button variant="outline" className="rounded-2xl border-white/30 bg-transparent px-8 text-white hover:bg-white/10">
                Join as Provider
              </Button>
            </Link>
          </div>
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
  const [location, setLocation] = useState('')

  return (
    <motion.div {...fade}>
      <SectionHeader title="Services" subtitle="Browse service types available on SevaLink." />
      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_2fr_160px]">
        <Input placeholder="Search services" />
        <LocationSelector className="lg:col-span-2" value={location} onChange={setLocation} />
        <Button variant="outline">Filter</Button>
      </div>
      <div className="mb-5 grid gap-3 md:grid-cols-2">
        <Select placeholder="Category" options={[{ label: 'All', value: 'all' }]} />
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
  const [location, setLocation] = useState('')
  const [search, setSearch] = useState('')
  const filteredProviders = (data || []).filter((provider) => {
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      (provider.business_name || provider.name || '').toLowerCase().includes(q) ||
      (provider.services_label || provider.service_names?.join(' ') || '').toLowerCase().includes(q)
    const matchesLocation = !location || (provider.location || '').toLowerCase().includes(location.toLowerCase())
    return matchesSearch && matchesLocation
  })

  return (
    <motion.div {...fade}>
      <SectionHeader title="Service Providers" subtitle="Browse provider profiles, ratings, certificates and recent work." />
      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_2fr_160px]">
        <Input placeholder="Search providers" value={search} onChange={(event) => setSearch(event.target.value)} />
        <LocationSelector value={location} onChange={setLocation} />
        <Button variant="outline" onClick={() => { setSearch(''); setLocation('') }}>Reset</Button>
      </div>
      {isLoading ? <LoadingGrid /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProviders.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}
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
          <p className="mt-1 text-muted-foreground">{data.services_label || data.service_names?.join(', ') || 'Services not selected'} • {data.location}</p>
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
  const [location, setLocation] = useState('')

  if (isLoading) return <LoadingGrid />

  return (
    <motion.div className="space-y-5" {...fade}>
      <SectionHeader title="Search Services" subtitle="Use advanced filters and smart suggestions." />
      <Card className="grid gap-3 lg:grid-cols-6">
        <Input className="lg:col-span-2" placeholder="What service are you looking for?" />
        <Select placeholder="Category" options={[{ label: 'All', value: 'all' }]} />
        <LocationSelector value={location} onChange={setLocation} />
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
