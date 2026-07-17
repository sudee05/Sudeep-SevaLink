import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Bell, Calendar, CheckCircle2, CircleDollarSign, Clock, Plus, Upload } from 'lucide-react'
import { useBookingsQuery, useNotificationsQuery, useProviderBookingsQuery } from '@/hooks/use-queries'
import { useRealtimeNotifications } from '@/hooks/use-realtime'
import { BookingBarChart, RevenueAreaChart } from '@/components/charts/revenue-booking-chart'
import { BookingChatPanel } from '@/components/common/booking-chat-panel'
import { DataTable } from '@/components/common/data-table'
import { SectionHeader } from '@/components/common/section-header'
import { StatCard } from '@/components/common/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingGrid } from '@/components/ui/loading-grid'
import { supabase } from '@/lib/supabase'
import {
  getBookingById,
  getProviderByUserId,
  markAllNotificationsRead,
  markNotificationRead,
  updateBookingStatus,
  uploadProviderImage,
  upsertProviderProfile,
} from '@/services/supabaseApi'
import { formatCurrency, formatDate } from '@/utils/format'

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
  const [providerRecord, setProviderRecord] = useState(null)
  const [averageRating, setAverageRating] = useState(0)
  const [loadingProvider, setLoadingProvider] = useState(true)
  const bookings = useProviderBookingsQuery(providerRecord?.id)

  useEffect(() => {
    let active = true

    async function loadProviderDashboard() {
      setLoadingProvider(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (active) setLoadingProvider(false)
        return
      }

      const provider = await getProviderByUserId(user.id)
      if (!active) return

      setProviderRecord(provider)
      if (provider?.id) {
        const { data: feedback } = await supabase
          .from('booking_feedback')
          .select('rating')
          .eq('provider_id', provider.id)

        const ratings = (feedback || []).map((item) => Number(item.rating)).filter(Boolean)
        const feedbackAverage = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0
        setAverageRating(feedbackAverage || Number(provider.rating || 0))
      }

      setLoadingProvider(false)
    }

    loadProviderDashboard()
    return () => {
      active = false
    }
  }, [])

  const providerBookings = bookings.data || []
  const dashboardStats = useMemo(() => {
    const today = new Date().toDateString()
    const todaysBookings = providerBookings.filter((booking) => new Date(booking.date).toDateString() === today).length
    const pendingBookings = providerBookings.filter((booking) => ['pending', 'reschedule_requested'].includes(booking.status)).length
    const completedBookings = providerBookings.filter((booking) => booking.status === 'completed').length
    const revenue = providerBookings
      .filter((booking) => booking.status === 'completed')
      .reduce((sum, booking) => sum + Number(booking.amount || 0), 0)

    const monthlyMap = providerBookings.reduce((map, booking) => {
      const date = new Date(booking.date || booking.created_at)
      const month = date.toLocaleString('en-US', { month: 'short' })
      if (!map[month]) map[month] = { month, revenue: 0, bookings: 0 }
      map[month].bookings += 1
      map[month].revenue += Number(booking.amount || 0)
      return map
    }, {})

    return {
      todaysBookings,
      pendingBookings,
      completedBookings,
      revenue,
      trend: Object.values(monthlyMap),
    }
  }, [providerBookings])

  return (
    <motion.div className="space-y-6" {...fade}>
      <SectionHeader title="Business Overview" subtitle="Manage jobs, revenue, and client experience from one dashboard." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Today's Bookings" value={loadingProvider || bookings.isLoading ? '...' : dashboardStats.todaysBookings} icon={Calendar} />
        <StatCard label="Pending Requests" value={loadingProvider || bookings.isLoading ? '...' : dashboardStats.pendingBookings} icon={Clock} />
        <StatCard label="Completed Jobs" value={loadingProvider || bookings.isLoading ? '...' : dashboardStats.completedBookings} icon={CheckCircle2} />
        <StatCard label="Revenue" value={loadingProvider || bookings.isLoading ? '...' : formatCurrency(dashboardStats.revenue)} icon={CircleDollarSign} />
        <StatCard label="Average Rating" value={loadingProvider ? '...' : Number(averageRating || 0).toFixed(1)} icon={CheckCircle2} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <RevenueAreaChart data={dashboardStats.trend} />
        <BookingBarChart data={dashboardStats.trend} />
      </div>
      <Card>
        <SectionHeader title="Recent Bookings" subtitle="Accept, reject, or reschedule incoming jobs." />
        <DataTable
          columns={[
            { key: 'customer', label: 'Customer' },
            { key: 'service', label: 'Service' },
            { key: 'date', label: 'Time', render: (row) => formatDate(row.date) },
            { key: 'status', label: 'Status', render: (row) => <Badge variant={row.status === 'Completed' ? 'success' : 'warning'}>{row.status}</Badge> },
            {
              key: 'action',
              label: 'Action',
              render: (row) => (
                <div className="flex flex-wrap gap-1">
                  <Link to={`/provider/bookings/${row.id}`}>
                    <Button size="sm" variant="outline">View</Button>
                  </Link>
                  <ProviderBookingActions booking={row} />
                </div>
              ),
            },
          ]}
          rows={providerBookings}
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
          { key: 'customer', label: 'Customer' },
          { key: 'address', label: 'Address' },
          { key: 'date', label: 'Scheduled', render: (row) => formatDate(row.date) },
          { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount) },
          {
            key: 'manage',
            label: 'Manage',
            render: (row) => (
              <div className="flex flex-wrap gap-1">
                <Link to={`/provider/bookings/${row.id}`}>
                  <Button size="sm" variant="outline">View Details</Button>
                </Link>
                <ProviderBookingActions booking={row} />
              </div>
            ),
          },
        ]}
        rows={data}
      />
    </motion.div>
  )
}

export function ProviderBookingDetailsPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState(null)
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadBooking() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!active) return
      setUserId(user?.id || null)

      if (!id) {
        setLoading(false)
        return
      }

      const data = await getBookingById(id)
      if (active) {
        setBooking(data)
        setLoading(false)
      }
    }

    loadBooking()
    return () => {
      active = false
    }
  }, [id])

  const statusMutation = useMutation({
    mutationFn: (status) => updateBookingStatus(booking.id, status),
    onSuccess: (updatedBooking) => {
      setBooking((current) => ({ ...current, ...updatedBooking }))
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })

  if (loading) return <LoadingGrid count={2} />
  if (!booking) return <EmptyState title="Booking not found" />

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title={`Booking ${booking.booking_code || booking.id}`} subtitle="View booking details, status actions, and customer messages." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h3 className="font-semibold">Booking Details</h3>
          <p className="text-sm text-muted-foreground">Customer: {booking.customer_name || booking.customer || '-'}</p>
          <p className="text-sm text-muted-foreground">Phone: {booking.customer_phone || '-'}</p>
          <p className="text-sm text-muted-foreground">Service: {booking.service_title || booking.service || '-'}</p>
          <p className="text-sm text-muted-foreground">Scheduled: {formatDate(booking.date)}</p>
          <p className="text-sm text-muted-foreground">Address: {booking.address || '-'}</p>
          <p className="text-sm text-muted-foreground">Notes: {booking.notes || '-'}</p>
          <Badge variant={booking.status === 'completed' ? 'success' : booking.status === 'cancelled' || booking.status === 'rejected' ? 'danger' : 'warning'}>{booking.status}</Badge>
        </Card>
        <Card className="space-y-3">
          <h3 className="font-semibold">Manage Booking</h3>
          <ProviderBookingActions booking={booking} />
          {booking.status === 'accepted' && (
            <Button disabled={statusMutation.isPending} onClick={() => statusMutation.mutate('in_progress')}>
              Mark In Progress
            </Button>
          )}
        </Card>
      </div>
      <BookingChatPanel booking={booking} userId={userId} />
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

export function ProviderAnalyticsPage() {
  const [providerRecord, setProviderRecord] = useState(null)
  const bookings = useProviderBookingsQuery(providerRecord?.id)

  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const provider = await getProviderByUserId(user.id)
      if (active) setProviderRecord(provider)
    })
    return () => {
      active = false
    }
  }, [])

  const trend = useMemo(() => {
    const monthlyMap = (bookings.data || []).reduce((map, booking) => {
      const date = new Date(booking.date || booking.created_at)
      const month = date.toLocaleString('en-US', { month: 'short' })
      if (!map[month]) map[month] = { month, revenue: 0, bookings: 0 }
      map[month].bookings += 1
      map[month].revenue += Number(booking.amount || 0)
      return map
    }, {})

    return Object.values(monthlyMap)
  }, [bookings.data])

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title="Analytics" subtitle="Revenue and booking performance by month." />
      <div className="grid gap-4 xl:grid-cols-2">
        <RevenueAreaChart data={trend} />
        <BookingBarChart data={trend} />
      </div>
    </motion.div>
  )
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

export function ProviderNotificationsPage() {
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id || null))
  }, [])

  const notifications = useNotificationsQuery(userId)
  useRealtimeNotifications(userId)

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  })

  const unreadCount = (notifications.data || []).filter((notification) => !notification.is_read).length

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader
        title="Notifications"
        subtitle="Booking, provider approval, service request, and message updates."
        action={unreadCount ? <Button size="sm" variant="outline" onClick={() => markAllReadMutation.mutate()}>Mark all read</Button> : null}
      />
      {notifications.isLoading ? <LoadingGrid count={3} /> : (notifications.data || []).length ? (
        <div className="space-y-3">
          {notifications.data.map((notification) => (
            <Card key={notification.id} className={`flex items-start justify-between gap-4 ${notification.is_read ? 'opacity-70' : ''}`}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">{notification.title}</h3>
                  {!notification.is_read && <Badge variant="secondary">New</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatDate(notification.created_at)}</p>
              </div>
              {!notification.is_read && (
                <Button size="sm" variant="outline" disabled={markReadMutation.isPending} onClick={() => markReadMutation.mutate(notification.id)}>
                  Mark read
                </Button>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No notifications" description="New booking and approval updates will appear here." />
      )}
    </motion.div>
  )
}

export function ProviderProfilePage() {
  const [userId, setUserId] = useState(null)
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({
    business_name: '',
    phone: '',
    location: '',
    experience: '',
    certificates: '',
    image_url: '',
    about: '',
  })
  const [imageFile, setImageFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (active) setLoading(false)
        return
      }

      const [{ data: userProfile }, provider] = await Promise.all([
        supabase.from('profiles').select('id, full_name, phone').eq('id', user.id).maybeSingle(),
        getProviderByUserId(user.id),
      ])

      if (active) {
        setUserId(user.id)
        setProfile(userProfile)
        setForm({
          business_name: provider?.business_name || userProfile?.full_name || '',
          phone: userProfile?.phone || '',
          location: provider?.location || '',
          experience: provider?.experience || '',
          certificates: (provider?.certificates || []).join(', '),
          image_url: provider?.image_url || '',
          about: provider?.about || '',
        })
        setLoading(false)
      }
    }

    loadProfile()
    return () => {
      active = false
    }
  }, [])

  const saveMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = form.image_url
      if (imageFile) {
        imageUrl = await uploadProviderImage({ userId, file: imageFile })
      }

      await supabase.from('profiles').update({ phone: form.phone }).eq('id', userId)
      return upsertProviderProfile(userId, {
        ...form,
        image_url: imageUrl,
        certificates: form.certificates.split(',').map((item) => item.trim()).filter(Boolean),
      })
    },
    onSuccess: (provider) => {
      setSaved(true)
      setImageFile(null)
      setForm((current) => ({ ...current, image_url: provider.image_url || current.image_url }))
    },
  })

  function handleSubmit(event) {
    event.preventDefault()
    if (!userId || !form.business_name.trim()) return
    saveMutation.mutate()
  }

  if (loading) return <LoadingGrid count={2} />

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title="Business Profile" subtitle="Edit business details, documents, and certifications." />
      <Card>
        <form className="grid gap-4 md:grid-cols-[220px_1fr]" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
              {form.image_url ? (
                <img src={form.image_url} alt={form.business_name || 'Provider'} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">No image</div>
              )}
            </div>
            <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:bg-muted">
              <Upload className="h-4 w-4" />
              Upload Image
              <input type="file" accept="image/*" className="hidden" onChange={(event) => setImageFile(event.target.files?.[0] || null)} />
            </label>
            {imageFile && <p className="text-xs text-muted-foreground">{imageFile.name}</p>}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input required placeholder="Business name" value={form.business_name} onChange={(event) => setForm((current) => ({ ...current, business_name: event.target.value }))} />
            <Input placeholder="Phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            <Input placeholder="Location" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} />
            <Input placeholder="Experience e.g. 5 years" value={form.experience} onChange={(event) => setForm((current) => ({ ...current, experience: event.target.value }))} />
            <Input className="md:col-span-2" placeholder="Certificates, comma separated" value={form.certificates} onChange={(event) => setForm((current) => ({ ...current, certificates: event.target.value }))} />
            <Input className="md:col-span-2" placeholder="Image URL" value={form.image_url} onChange={(event) => setForm((current) => ({ ...current, image_url: event.target.value }))} />
            <Textarea className="md:col-span-2" placeholder="About your business" value={form.about} onChange={(event) => setForm((current) => ({ ...current, about: event.target.value }))} />
            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : 'Save Changes'}</Button>
              {saved && <span className="text-sm font-medium text-green-600">Saved successfully</span>}
              {saveMutation.error && <span className="text-sm font-medium text-red-600">{saveMutation.error.message}</span>}
            </div>
          </div>
        </form>
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

