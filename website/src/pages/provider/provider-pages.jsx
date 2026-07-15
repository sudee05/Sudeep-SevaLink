import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
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
              render: () => (
                <div className="flex gap-1">
                  <Button size="sm">Accept</Button>
                  <Button size="sm" variant="outline">Reschedule</Button>
                </div>
              ),
            },
          ]}
          rows={bookings.data || []}
        />
      </Card>
    </motion.div>
  )
}

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
            render: () => (
              <div className="flex gap-1">
                <Button size="sm">Complete</Button>
                <Button size="sm" variant="outline">Reject</Button>
              </div>
            ),
          },
        ]}
        rows={data}
      />
    </motion.div>
  )
}

export function ProviderServicesPage() {
  const [catalog, setCatalog] = useState([])       // master list from services table
  const [enrolled, setEnrolled] = useState([])     // service IDs this provider has selected
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [providerRecord, setProviderRecord] = useState(null)
  // Request form
  const [reqName, setReqName] = useState('')
  const [reqDesc, setReqDesc] = useState('')
  const [reqLoading, setReqLoading] = useState(false)
  const [reqDone, setReqDone] = useState(false)
  const [tab, setTab] = useState('select') // 'select' | 'request'

  useEffect(() => {
    // Load master catalog
    supabase
      .from('services')
      .select('id, name, description')
      .order('name')
      .then(({ data }) => setCatalog(data || []))

    // Get current provider record to know their ID
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('providers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return
          setProviderRecord(data)
          // Load enrolled services
          supabase
            .from('provider_services')
            .select('service_id')
            .eq('provider_id', data.id)
            .then(({ data: ps }) => setEnrolled((ps || []).map((r) => r.service_id)))
        })
    })
  }, [])

  function toggleService(id) {
    setEnrolled((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
    setSaved(false)
  }

  async function handleSave() {
    if (!providerRecord) return
    setSaving(true)
    try {
      await supabase.from('provider_services').delete().eq('provider_id', providerRecord.id)
      if (enrolled.length) {
        await supabase.from('provider_services').insert(
          enrolled.map((service_id) => ({ provider_id: providerRecord.id, service_id }))
        )
      }
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  async function handleRequest(e) {
    e.preventDefault()
    if (!reqName.trim() || !providerRecord) return
    setReqLoading(true)
    try {
      await supabase.from('service_requests').insert({
        provider_id: providerRecord.id,
        name: reqName.trim(),
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

      {/* Tabs */}
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

      {tab === 'select' && (
        <Card>
          {catalog.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No services available yet. Check back soon.</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                {enrolled.length} of {catalog.length} services selected
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {catalog.map((svc) => {
                  const checked = enrolled.includes(svc.id)
                  return (
                    <button
                      key={svc.id}
                      onClick={() => toggleService(svc.id)}
                      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all hover:shadow-sm ${
                        checked
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                          : 'border-border bg-background hover:border-primary/40'
                      }`}
                    >
                      <div className={`mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${
                        checked ? 'border-primary bg-primary' : 'border-border'
                      }`}>
                        {checked && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{svc.name}</p>
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

      {tab === 'request' && (
        <Card>
          <h3 className="mb-1 font-semibold">Request a New Service Type</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Don't see your service in the catalog? Request it and our admin team will review it.
          </p>
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
                <label className="mb-1 block text-sm font-medium">Service Name <span className="text-red-500">*</span></label>
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
              <Button type="submit" disabled={reqLoading || !reqName.trim()}>
                {reqLoading ? 'Submitting…' : 'Submit Request'}
              </Button>
            </form>
          )}
        </Card>
      )}
    </motion.div>
  )
}


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
  return <ModuleCard title="Reviews" subtitle="Monitor service quality feedback and customer sentiment." />
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
