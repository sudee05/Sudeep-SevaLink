import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, CheckCircle2, CircleDollarSign, Clock, Plus } from 'lucide-react'
import { useBookingsQuery } from '@/hooks/use-queries'
import { BookingBarChart, RevenueAreaChart } from '@/components/charts/revenue-booking-chart'
import { DataTable } from '@/components/common/data-table'
import { SectionHeader } from '@/components/common/section-header'
import { StatCard } from '@/components/common/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { updateBookingStatus } from '@/services/supabaseApi'
import { formatCurrency, formatDate } from '@/utils/format'

const mockTrend = [
  { month: 'Jan', revenue: 320000, bookings: 140 },
  { month: 'Feb', revenue: 360000, bookings: 158 },
  { month: 'Mar', revenue: 410000, bookings: 175 },
  { month: 'Apr', revenue: 440000, bookings: 188 },
  { month: 'May', revenue: 490000, bookings: 212 },
  { month: 'Jun', revenue: 540000, bookings: 236 },
]

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
}

function ProviderBookingActions({ booking }) {
  const queryClient = useQueryClient()
  const statusMutation = useMutation({
    mutationFn: (status) => updateBookingStatus(booking.id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  })

  const busy = statusMutation.isPending

  if (booking.status === 'completed' || booking.status === 'cancelled' || booking.status === 'rejected') {
    return <span className="text-xs text-muted-foreground capitalize">{booking.status}</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {booking.status === 'pending' && (
        <>
          <Button size="sm" disabled={busy} onClick={() => statusMutation.mutate('accepted')}>Accept</Button>
          <Button size="sm" variant="danger" disabled={busy} onClick={() => statusMutation.mutate('rejected')}>Reject</Button>
        </>
      )}
      {['pending', 'accepted', 'confirmed'].includes(booking.status) && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => statusMutation.mutate('reschedule_requested')}>Reschedule</Button>
      )}
      {['accepted', 'confirmed', 'in_progress'].includes(booking.status) && (
        <Button size="sm" disabled={busy} onClick={() => statusMutation.mutate('completed')}>Complete</Button>
      )}
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────

export function ProviderDashboardPage() {
  const bookings = useBookingsQuery()

  return (
    <motion.div className="space-y-6" {...fade}>
      <SectionHeader title="Business Overview" subtitle="Manage jobs, revenue, and client experience from one dashboard." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Today's Bookings" value="12" delta="+18%" icon={Calendar} />
        <StatCard label="Pending Requests" value="08" delta="+4%" icon={Clock} />
        <StatCard label="Completed Jobs" value="186" delta="+21%" icon={CheckCircle2} />
        <StatCard label="Revenue" value="₹5.4L" delta="+11%" icon={CircleDollarSign} />
        <StatCard label="Average Rating" value="4.9" delta="+0.2" icon={CheckCircle2} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <RevenueAreaChart data={mockTrend} />
        <BookingBarChart data={mockTrend} />
      </div>
      <Card>
        <SectionHeader title="Recent Bookings" subtitle="Accept, reject, or reschedule incoming jobs." />
        <DataTable
          columns={[
            { key: 'id', label: 'Booking' },
            { key: 'customer', label: 'Customer' },
            { key: 'service', label: 'Service' },
            { key: 'date', label: 'Time', render: (row) => formatDate(row.date) },
            { key: 'status', label: 'Status', render: (row) => <Badge variant={row.status === 'Completed' ? 'success' : 'warning'}>{row.status}</Badge> },
            {
              key: 'action',
              label: 'Action',
              render: (row) => <ProviderBookingActions booking={row} />,
            },
          ]}
          rows={bookings.data || []}
        />
      </Card>
    </motion.div>
  )
}

// ── Bookings ──────────────────────────────────────────────────

export function ProviderBookingsPage() {
  const { data = [] } = useBookingsQuery()

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title="Bookings" subtitle="View details, timelines, and invoices." />
      <DataTable
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'customer', label: 'Customer' },
          { key: 'address', label: 'Address' },
          { key: 'date', label: 'Scheduled', render: (row) => formatDate(row.date) },
          { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount) },
          {
            key: 'manage',
            label: 'Manage',
            render: (row) => <ProviderBookingActions booking={row} />,
          },
        ]}
        rows={data}
      />
    </motion.div>
  )
}

// ── Services ──────────────────────────────────────────────────

export function ProviderServicesPage() {
  const [catalog, setCatalog] = useState([])       // master list from services table
  const [enrolled, setEnrolled] = useState([])     // service IDs this provider has selected
  const [primaryServiceId, setPrimaryServiceId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [providerRecord, setProviderRecord] = useState(null)
  const [userProfile, setUserProfile] = useState(null) // holds { id, phone } from profiles table

  // Request form
  const [reqName, setReqName] = useState('')
  const [reqDesc, setReqDesc] = useState('')
  const [reqLoading, setReqLoading] = useState(false)
  const [reqDone, setReqDone] = useState(false)
  const [tab, setTab] = useState('select') // 'select' | 'request'

  useEffect(() => {
    // Load master service catalog
    supabase
      .from('services')
      .select('id, name, description')
      .order('name')
      .then(({ data }) => setCatalog(data || []))

    // Get current auth user → fetch their profile (phone) + provider record
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      // Fetch profile for user_id + phone (used in service_requests)
      supabase
        .from('profiles')
        .select('id, full_name, phone')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data: profile }) => setUserProfile(profile))

      // Fetch provider record for provider_id
      supabase
        .from('providers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data: provider }) => {
          if (!provider) return
          setProviderRecord(provider)
          // Load already-enrolled services
          supabase
            .from('provider_services')
            .select('service_id')
            .eq('provider_id', provider.id)
            .order('created_at', { ascending: true })
            .then(({ data: ps }) => {
              const serviceIds = (ps || []).map((r) => r.service_id)
              setEnrolled(serviceIds)
              setPrimaryServiceId(serviceIds[0] || null)
            })
        })
    })
  }, [])

  function toggleService(id) {
    if (id === primaryServiceId) return

    setEnrolled((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
    setSaved(false)
  }

  async function handleSave() {
    if (!providerRecord) return
    setSaving(true)
    try {
      const servicesToSave = primaryServiceId
        ? [primaryServiceId, ...enrolled.filter((serviceId) => serviceId !== primaryServiceId)]
        : enrolled

      await supabase.from('provider_services').delete().eq('provider_id', providerRecord.id)
      if (servicesToSave.length) {
        await supabase.from('provider_services').insert(
          servicesToSave.map((service_id) => ({ provider_id: providerRecord.id, service_id }))
        )
      }
      setEnrolled(servicesToSave)
      setPrimaryServiceId(servicesToSave[0] || null)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  async function handleRequest(e) {
    e.preventDefault()
    if (!reqName.trim() || !providerRecord || !userProfile?.id) return
    setReqLoading(true)
    try {
      await supabase.from('service_requests').insert({
        provider_id: providerRecord.id,
        user_id: userProfile.id,                // auto from logged-in user
        phone: userProfile?.phone || '',         // auto from profiles table
        service_name: reqName.trim(),
        description: reqDesc.trim(),
        status: 'pending',
      })
      setReqDone(true)
      setReqName('')
      setReqDesc('')
    } finally {
      setReqLoading(false)
    }
  }

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader
        title="My Services"
        subtitle="Select the services you offer from the catalog, or request a new one."
      />

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit">
        {[
          { key: 'select', label: 'Select Services' },
          { key: 'request', label: 'Request New Service' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
              tab === t.key ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Select Services tab ── */}
      {tab === 'select' && (
        <Card>
          {catalog.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No services available yet. Check back soon.</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                {enrolled.length} of {catalog.length} services selected
              </p>
              {primaryServiceId && (
                <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                  <span className="font-semibold text-foreground">Primary service: </span>
                  <span className="text-muted-foreground">
                    {catalog.find((service) => service.id === primaryServiceId)?.name || 'Selected service'}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This service is locked because it is the provider's primary service. Other selected services can be changed.
                  </p>
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {catalog.map((svc) => {
                  const checked = enrolled.includes(svc.id)
                  const isPrimary = svc.id === primaryServiceId
                  return (
                    <button
                      key={svc.id}
                      onClick={() => toggleService(svc.id)}
                      disabled={isPrimary}
                      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all hover:shadow-sm ${
                        checked
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                          : 'border-border bg-background hover:border-primary/40'
                      } ${isPrimary ? 'cursor-not-allowed opacity-90' : ''}`}
                    >
                      <div className={`mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${
                        checked ? 'border-primary bg-primary' : 'border-border'
                      }`}>
                        {checked && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{svc.name}</p>
                          {isPrimary && <Badge variant="secondary">Primary</Badge>}
                        </div>
                        {svc.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{svc.description}</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save My Services'}
                </Button>
                {saved && <span className="text-sm text-green-600 font-medium">✓ Saved successfully!</span>}
              </div>
            </>
          )}
        </Card>
      )}

      {/* ── Request New Service tab ── */}
      {tab === 'request' && (
        <Card>
          <h3 className="mb-1 font-semibold">Request a New Service Type</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Don't see your service in the catalog? Request it and our admin team will review it.
            Your contact details are attached automatically.
          </p>

          {/* Auto-filled info banner */}
          {userProfile && (
            <div className="mb-4 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Submitting as: </span>
              {userProfile.full_name}
              {userProfile.phone && <> &nbsp;·&nbsp; {userProfile.phone}</>}
            </div>
          )}

          {reqDone ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
            >
              ✓ Request submitted! Our team will review it within 1–2 business days.
              <Button variant="outline" className="mt-3 block" onClick={() => setReqDone(false)}>
                Submit another
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleRequest} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Service Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Solar Panel Installation"
                  value={reqName}
                  onChange={(e) => setReqName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Description</label>
                <textarea
                  className="h-24 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Describe the service briefly…"
                  value={reqDesc}
                  onChange={(e) => setReqDesc(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={reqLoading || !reqName.trim() || !userProfile?.id}>
                {reqLoading ? 'Submitting…' : 'Submit Request'}
              </Button>
            </form>
          )}
        </Card>
      )}
    </motion.div>
  )
}

// ── Vehicles ──────────────────────────────────────────────────

export function ProviderVehiclesPage() {
  const vehicles = [
    { name: 'Tata Ace', type: 'Mini Truck', pricing: '₹499/hr', availability: 'Available' },
    { name: 'Maruti Eeco', type: 'Van', pricing: '₹399/hr', availability: 'Busy' },
  ]

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title="Vehicles" subtitle="Manage logistics, pricing, and gallery." action={<Button><Plus className="h-4 w-4" /> Add Vehicle</Button>} />
      <DataTable
        columns={[
          { key: 'name', label: 'Vehicle' },
          { key: 'type', label: 'Type' },
          { key: 'pricing', label: 'Pricing' },
          { key: 'availability', label: 'Availability' },
          { key: 'manage', label: 'Manage', render: () => <Button size="sm" variant="outline">Details</Button> },
        ]}
        rows={vehicles}
      />
    </motion.div>
  )
}

// ── Stub pages ────────────────────────────────────────────────

export function ProviderPackagesPage() {
  return <ModuleCard title="Packages" subtitle="Bundle services for higher average order value." />
}

export function ProviderCalendarPage() {
  return <ModuleCard title="Calendar" subtitle="Monthly schedule with booking slots and conflicts." />
}

export function ProviderAnalyticsPage() {
  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title="Analytics" subtitle="Revenue and booking performance by month." />
      <div className="grid gap-4 xl:grid-cols-2">
        <RevenueAreaChart data={mockTrend} />
        <BookingBarChart data={mockTrend} />
      </div>
    </motion.div>
  )
}

export function ProviderPaymentsPage() {
  return <ModuleCard title="Payments" subtitle="Track payouts, invoices, taxes, and settlement history." />
}

export function ProviderReviewsPage() {
  const [providerRecord, setProviderRecord] = useState(null)
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadFeedback() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (active) setLoading(false)
        return
      }

      const { data: provider } = await supabase
        .from('providers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!provider) {
        if (active) {
          setProviderRecord(null)
          setFeedback([])
          setLoading(false)
        }
        return
      }

      const { data } = await supabase
        .from('booking_feedback')
        .select('*, profiles(full_name), bookings(booking_code, service_title)')
        .eq('provider_id', provider.id)
        .order('created_at', { ascending: false })

      if (active) {
        setProviderRecord(provider)
        setFeedback(data || [])
        setLoading(false)
      }
    }

    loadFeedback()
    return () => {
      active = false
    }
  }, [])

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title="Reviews" subtitle="Customer feedback for your completed bookings." />
      {loading ? <LoadingGrid count={3} /> : !providerRecord ? (
        <Card className="text-sm text-muted-foreground">Complete your provider profile to receive feedback.</Card>
      ) : feedback.length ? (
        <DataTable
          columns={[
            { key: 'booking', label: 'Booking', render: (row) => row.bookings?.booking_code || row.booking_id },
            { key: 'service', label: 'Service', render: (row) => row.bookings?.service_title || '-' },
            { key: 'customer', label: 'Customer', render: (row) => row.profiles?.full_name || '-' },
            { key: 'rating', label: 'Rating', render: (row) => `${row.rating}/5` },
            { key: 'comment', label: 'Comment', render: (row) => row.comment || '-' },
            { key: 'created_at', label: 'Created', render: (row) => formatDate(row.created_at) },
          ]}
          rows={feedback}
        />
      ) : (
        <Card className="text-sm text-muted-foreground">No feedback yet.</Card>
      )}
    </motion.div>
  )
}

export function ProviderProfilePage() {
  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title="Business Profile" subtitle="Edit business details, documents, and certifications." />
      <Card className="grid gap-3 md:grid-cols-2">
        <Input defaultValue="SparkNest Pro Services" />
        <Input defaultValue="support@sparknest.app" />
        <Input defaultValue="+91 98765 12345" />
        <Input defaultValue="Bengaluru" />
        <Textarea className="md:col-span-2" defaultValue="Trusted partner for premium cleaning and sanitization services." />
        <Button className="md:col-span-2">Save Changes</Button>
      </Card>
    </motion.div>
  )
}

export function ProviderSettingsPage() {
  return <ModuleCard title="Settings" subtitle="Password, alerts, and notification channels." />
}

function ModuleCard({ title, subtitle }) {
  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title={title} subtitle={subtitle} />
      <Card className="text-sm text-muted-foreground">This module includes list, details, actions, loading state, and API-ready wiring points for Supabase integration.</Card>
    </motion.div>
  )
}
