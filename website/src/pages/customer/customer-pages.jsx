import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { CalendarCheck, Clock3, CreditCard, Heart, MapPin, Receipt, Sparkles } from 'lucide-react'
import { useBookingsQuery, useProvidersByServiceQuery, useServicesQuery } from '@/hooks/use-queries'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingGrid } from '@/components/ui/loading-grid'
import { DataTable } from '@/components/common/data-table'
import { SectionHeader } from '@/components/common/section-header'
import { ServiceCard } from '@/components/common/service-card'
import { formatCurrency, formatDate } from '@/utils/format'
import { selectProfile } from '@/store/authSlice'
import { createBooking, createBookingComplaint, createBookingFeedback } from '@/services/supabaseApi'
import { useToast } from '@/hooks/use-toast'

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
}

function bookingStatusVariant(status) {
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'danger'
  return 'warning'
}

export function CustomerDashboardPage() {
  const bookings = useBookingsQuery()
  const services = useServicesQuery()
  const profile = useSelector(selectProfile)
  const queryClient = useQueryClient()
  const toast = useToast()
  const [selectedService, setSelectedService] = useState(null)
  const [location, setLocation] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [bookingProvider, setBookingProvider] = useState(null)
  const [bookingForm, setBookingForm] = useState({ booking_date: '', booking_time: '', address: '', notes: '' })
  const providers = useProvidersByServiceQuery(selectedService?.id)

  const visibleProviders = useMemo(() => {
    const priceLimit = Number(maxPrice)
    return (providers.data || []).filter((provider) => {
      const matchesLocation = !location || (provider.location || '').toLowerCase().includes(location.toLowerCase())
      const providerPrice = Number(provider.price || provider.starting_price || provider.base_price || 0)
      const matchesPrice = !priceLimit || !providerPrice || providerPrice <= priceLimit
      return matchesLocation && matchesPrice
    })
  }, [providers.data, location, maxPrice])

  const bookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('Booking created successfully.')
      setBookingProvider(null)
      setBookingForm({ booking_date: '', booking_time: '', address: '', notes: '' })
    },
    onError: (error) => toast.error(error.message || 'Could not create booking'),
  })

  function handleBookingSubmit(event) {
    event.preventDefault()
    if (!profile?.id || !selectedService || !bookingProvider) return

    bookingMutation.mutate({
      customer_id: profile.id,
      provider_id: bookingProvider.id,
      service_id: selectedService.id,
      service_title: selectedService.name,
      provider_name: bookingProvider.business_name || bookingProvider.name || '',
      customer_name: profile.full_name || '',
      booking_date: bookingForm.booking_date,
      booking_time: bookingForm.booking_time,
      address: bookingForm.address,
      notes: bookingForm.notes,
      amount: Number(bookingProvider.price || bookingProvider.starting_price || bookingProvider.base_price || 0),
      status: 'pending',
    })
  }

  return (
    <motion.div className="space-y-6" {...fade}>
      <SectionHeader
        title={`Welcome back${profile?.full_name ? `, ${profile.full_name}` : ''}`}
        subtitle="Select a service, compare providers, and book the date and time when you need help."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><p className="text-xs text-muted-foreground">Total Bookings</p><p className="mt-2 text-2xl font-bold">{bookings.data?.length || 0}</p></Card>
        <Card><p className="text-xs text-muted-foreground">Pending</p><p className="mt-2 text-2xl font-bold">{bookings.data?.filter((b) => b.status === 'pending').length || 0}</p></Card>
        <Card><p className="text-xs text-muted-foreground">Completed</p><p className="mt-2 text-2xl font-bold">{bookings.data?.filter((b) => b.status === 'completed').length || 0}</p></Card>
        <Card><p className="text-xs text-muted-foreground">Available Services</p><p className="mt-2 text-2xl font-bold">{services.data?.length || 0}</p></Card>
      </div>

      <Card>
        <SectionHeader title="Choose a Service" subtitle="Start by selecting what you need." />
        {services.isLoading ? <LoadingGrid count={3} /> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(services.data || []).map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => {
                  setSelectedService(service)
                  setBookingProvider(null)
                }}
                className={`rounded-xl border p-4 text-left transition hover:border-primary ${
                  selectedService?.id === service.id ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <p className="font-semibold">{service.name}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{service.description || 'Available service'}</p>
              </button>
            ))}
          </div>
        )}
      </Card>

      {selectedService && (
        <Card className="space-y-4">
          <SectionHeader
            title={`Providers for ${selectedService.name}`}
            subtitle="Filter by location now; price filtering is ready for your future provider price column."
          />
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Filter by location" value={location} onChange={(event) => setLocation(event.target.value)} />
            <Input type="number" min="0" placeholder="Max price" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} />
            <Button variant="outline" onClick={() => { setLocation(''); setMaxPrice('') }}>Reset Filters</Button>
          </div>
          {providers.isLoading ? <LoadingGrid count={3} /> : visibleProviders.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {visibleProviders.map((provider) => {
                const providerPrice = provider.price || provider.starting_price || provider.base_price
                return (
                  <Card key={provider.id} className="space-y-3">
                    <div>
                      <h3 className="font-semibold">{provider.business_name || provider.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {provider.location || 'Location not added'} | Rating {Number(provider.rating || 0).toFixed(1)}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{provider.about || provider.description || 'Provider details will appear here.'}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{Number(providerPrice || 0) ? formatCurrency(providerPrice) : 'Price TBD'}</p>
                      <Button size="sm" onClick={() => setBookingProvider(provider)}>Book</Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : <EmptyState title="No providers found" description="Try another service or clear your filters." />}
        </Card>
      )}

      {bookingProvider && (
        <Card>
          <SectionHeader
            title={`Book ${bookingProvider.business_name || bookingProvider.name}`}
            subtitle="Choose the date and time when the service is needed."
          />
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleBookingSubmit}>
            <Input required type="date" value={bookingForm.booking_date} onChange={(event) => setBookingForm((form) => ({ ...form, booking_date: event.target.value }))} />
            <Input required type="time" value={bookingForm.booking_time} onChange={(event) => setBookingForm((form) => ({ ...form, booking_time: event.target.value }))} />
            <Input required placeholder="Service address" className="md:col-span-2" value={bookingForm.address} onChange={(event) => setBookingForm((form) => ({ ...form, address: event.target.value }))} />
            <Textarea placeholder="Special instructions" className="md:col-span-2" value={bookingForm.notes} onChange={(event) => setBookingForm((form) => ({ ...form, notes: event.target.value }))} />
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={bookingMutation.isPending}>{bookingMutation.isPending ? 'Booking...' : 'Confirm Booking'}</Button>
              <Button type="button" variant="outline" onClick={() => setBookingProvider(null)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}
    </motion.div>
  )
}

export function CustomerBookingsPage() {
  const { data = [] } = useBookingsQuery()

  return (
    <motion.div className="space-y-5" {...fade}>
      <SectionHeader title="Booking History" subtitle="Track, reschedule, and manage bookings." action={<Button>Export</Button>} />
      <DataTable
        columns={[
          { key: 'booking_code', label: 'Booking ID', render: (row) => row.booking_code || row.id },
          { key: 'service', label: 'Service' },
          { key: 'date', label: 'Needed On', render: (row) => formatDate(row.date) },
          { key: 'status', label: 'Status', render: (row) => <Badge variant={bookingStatusVariant(row.status)}>{row.status}</Badge> },
          { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount) },
          { key: 'action', label: 'Action', render: (row) => <Link to={`/customer/bookings/${row.id}`} className="font-semibold text-primary">View</Link> },
        ]}
        rows={data}
      />
    </motion.div>
  )
}

export function CustomerBookingDetailsPage() {
  const { id } = useParams()
  const { data = [] } = useBookingsQuery()
  const profile = useSelector(selectProfile)
  const toast = useToast()
  const [feedback, setFeedback] = useState({ rating: '5', comment: '' })
  const [complaint, setComplaint] = useState({ subject: '', comment: '' })
  const booking = data.find((item) => item.id === id) || data[0]

  const feedbackMutation = useMutation({
    mutationFn: createBookingFeedback,
    onSuccess: () => {
      toast.success('Feedback submitted.')
      setFeedback({ rating: '5', comment: '' })
    },
    onError: (error) => toast.error(error.message || 'Could not submit feedback'),
  })

  const complaintMutation = useMutation({
    mutationFn: createBookingComplaint,
    onSuccess: () => {
      toast.success('Complaint submitted.')
      setComplaint({ subject: '', comment: '' })
    },
    onError: (error) => toast.error(error.message || 'Could not submit complaint'),
  })

  if (!booking) return <EmptyState title="No booking found" />

  function handleFeedbackSubmit(event) {
    event.preventDefault()
    feedbackMutation.mutate({
      booking_id: booking.id,
      provider_id: booking.provider_id,
      customer_id: profile.id,
      rating: Number(feedback.rating),
      comment: feedback.comment,
    })
  }

  function handleComplaintSubmit(event) {
    event.preventDefault()
    complaintMutation.mutate({
      booking_id: booking.id,
      provider_id: booking.provider_id,
      customer_id: profile.id,
      service_id: booking.service_id,
      subject: complaint.subject,
      comment: complaint.comment,
    })
  }

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title={`Booking ${booking.booking_code || booking.id}`} subtitle="Timeline, provider details, feedback and complaints." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h3 className="font-semibold">Booking Details</h3>
          <p className="text-sm text-muted-foreground">Service: {booking.service}</p>
          <p className="text-sm text-muted-foreground">Provider: {booking.provider}</p>
          <p className="text-sm text-muted-foreground">Needed on: {formatDate(booking.date)}</p>
          <p className="text-sm text-muted-foreground">Address: {booking.address}</p>
          <Badge variant={bookingStatusVariant(booking.status)}>{booking.status}</Badge>
        </Card>
        <Card className="space-y-3">
          <h3 className="font-semibold">Actions</h3>
          <Button className="w-full">Reschedule</Button>
          <Button variant="outline" className="w-full">Download Invoice</Button>
          <Button variant="danger" className="w-full">Cancel Booking</Button>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">Feedback</h3>
          <form className="space-y-3" onSubmit={handleFeedbackSubmit}>
            <Select
              value={feedback.rating}
              onChange={(event) => setFeedback((form) => ({ ...form, rating: event.target.value }))}
              options={[
                { label: '5 - Excellent', value: '5' },
                { label: '4 - Good', value: '4' },
                { label: '3 - Okay', value: '3' },
                { label: '2 - Poor', value: '2' },
                { label: '1 - Bad', value: '1' },
              ]}
            />
            <Textarea placeholder="Share feedback for the provider" value={feedback.comment} onChange={(event) => setFeedback((form) => ({ ...form, comment: event.target.value }))} />
            <Button type="submit" disabled={feedbackMutation.isPending}>{feedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}</Button>
          </form>
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold">Complaint</h3>
          <form className="space-y-3" onSubmit={handleComplaintSubmit}>
            <Input required placeholder="Subject" value={complaint.subject} onChange={(event) => setComplaint((form) => ({ ...form, subject: event.target.value }))} />
            <Textarea placeholder="Describe the issue" value={complaint.comment} onChange={(event) => setComplaint((form) => ({ ...form, comment: event.target.value }))} />
            <Button type="submit" variant="danger" disabled={complaintMutation.isPending}>{complaintMutation.isPending ? 'Submitting...' : 'Submit Complaint'}</Button>
          </form>
        </Card>
      </div>
    </motion.div>
  )
}

export function CustomerInvoicesPage() {
  const { data = [] } = useBookingsQuery()

  return (
    <motion.div {...fade}>
      <SectionHeader title="Invoices" subtitle="All receipts and GST invoices in one place." />
      <DataTable
        columns={[
          { key: 'booking_code', label: 'Invoice ID', render: (row) => row.booking_code || row.id },
          { key: 'service', label: 'Service' },
          { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount) },
          { key: 'date', label: 'Issued On', render: (row) => formatDate(row.date) },
          { key: 'download', label: 'Download', render: () => <Button size="sm" variant="outline"><Receipt className="h-3 w-3" /> PDF</Button> },
        ]}
        rows={data}
      />
    </motion.div>
  )
}

export function CustomerWishlistPage() {
  const { data = [] } = useServicesQuery()

  return (
    <motion.div className="space-y-5" {...fade}>
      <SectionHeader title="Wishlist" subtitle="Saved services and providers." />
      {data.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.slice(0, 3).map((service) => <ServiceCard key={service.id} service={service} />)}
        </div>
      ) : <EmptyState title="Wishlist is empty" />}
    </motion.div>
  )
}

export function CustomerNotificationsPage() {
  const notifications = [
    'Provider has accepted your booking',
    'Payment reminder for pending booking',
    'Special discount on selected services this week',
  ]

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title="Notifications" subtitle="Real-time service and booking alerts." />
      {notifications.map((note) => <Card key={note}>{note}</Card>)}
    </motion.div>
  )
}

export function CustomerProfilePage() {
  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title="Profile" subtitle="Manage personal details and addresses." />
      <Card className="grid gap-3 md:grid-cols-2">
        <Input defaultValue="Priya Sharma" />
        <Input defaultValue="priya@email.com" />
        <Input defaultValue="+91 98765 43210" />
        <Input defaultValue="Bengaluru" />
        <Textarea className="md:col-span-2" defaultValue="HSR Layout, Bengaluru" />
        <Button className="md:col-span-2">Save Profile</Button>
      </Card>
    </motion.div>
  )
}

export function CustomerSettingsPage() {
  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title="Settings" subtitle="Notification preferences, security and account management." />
      <Card className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-border p-3"><p>Email Notifications</p><Button size="sm">Enabled</Button></div>
        <div className="flex items-center justify-between rounded-xl border border-border p-3"><p>SMS Alerts</p><Button size="sm" variant="outline">Disabled</Button></div>
        <div className="flex items-center justify-between rounded-xl border border-border p-3"><p>Two-Factor Authentication</p><Button size="sm">Enabled</Button></div>
      </Card>
    </motion.div>
  )
}

export function BookingNewPage() {
  return (
    <motion.div className="space-y-5" {...fade}>
      <SectionHeader title="Booking Form" subtitle="Choose date, time, address and requirements." />
      <Card className="grid gap-3 md:grid-cols-2">
        <Input type="date" />
        <Input type="time" />
        <Input placeholder="Service address" className="md:col-span-2" />
        <Textarea className="md:col-span-2" placeholder="Special instructions" />
        <Card className="md:col-span-2">
          <p className="text-sm text-muted-foreground">Summary</p>
          <p className="font-semibold">Select a service from the dashboard to create a live booking.</p>
        </Card>
        <Link to="/customer"><Button className="w-full md:col-span-2">Back to Services</Button></Link>
      </Card>
    </motion.div>
  )
}

export function BookingPaymentPage() {
  return (
    <motion.div className="space-y-5" {...fade}>
      <SectionHeader title="Payment" subtitle="Secure checkout with invoice support." />
      <Card className="space-y-3">
        <Select placeholder="Payment Method" options={[{ label: 'UPI', value: 'upi' }, { label: 'Card', value: 'card' }]} />
        <Input placeholder="Card or UPI ID" />
        <div className="flex gap-2">
          <Link to="/customer/booking/success" className="flex-1"><Button className="w-full"><CreditCard className="h-4 w-4" /> Pay Now</Button></Link>
          <Link to="/customer/booking/failed" className="flex-1"><Button variant="outline" className="w-full">Simulate Failure</Button></Link>
        </div>
      </Card>
    </motion.div>
  )
}

export function BookingSuccessPage() {
  return (
    <motion.div className="space-y-4" {...fade}>
      <Card className="text-center">
        <CalendarCheck className="mx-auto mb-3 h-10 w-10 text-secondary" />
        <h2 className="text-2xl font-bold">Booking Confirmed</h2>
        <p className="mt-2 text-sm text-muted-foreground">Your service is successfully booked and provider is notified.</p>
        <Link to="/customer/bookings"><Button className="mt-4">View Bookings</Button></Link>
      </Card>
    </motion.div>
  )
}

export function BookingFailedPage() {
  return (
    <motion.div className="space-y-4" {...fade}>
      <Card className="text-center">
        <Clock3 className="mx-auto mb-3 h-10 w-10 text-red-500" />
        <h2 className="text-2xl font-bold">Payment Failed</h2>
        <p className="mt-2 text-sm text-muted-foreground">There was an issue processing your payment.</p>
        <Link to="/customer"><Button className="mt-4">Try Again</Button></Link>
      </Card>
    </motion.div>
  )
}

export function BookingTrackingPage() {
  const { id } = useParams()

  return (
    <motion.div className="space-y-5" {...fade}>
      <SectionHeader title={`Tracking ${id}`} subtitle="Live updates from provider and platform." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2 text-sm text-muted-foreground">
          <p className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4" />Booking confirmed</p>
          <p className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />Provider on the way</p>
          <p className="inline-flex items-center gap-2"><Heart className="h-4 w-4" />Estimated arrival in 25 mins</p>
        </Card>
        <Card>
          <h3 className="font-semibold">Provider Contact</h3>
          <p className="mt-2 text-sm text-muted-foreground">Provider details appear after assignment.</p>
          <Button className="mt-4">Call Provider</Button>
        </Card>
      </div>
    </motion.div>
  )
}
