import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarCheck, Clock3, CreditCard, Heart, MapPin, Receipt, Sparkles } from 'lucide-react'
import { useBookingsQuery, useServicesQuery } from '@/hooks/use-mock-queries'
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

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
}

export function CustomerDashboardPage() {
  const bookings = useBookingsQuery()
  const services = useServicesQuery()

  return (
    <motion.div className="space-y-6" {...fade}>
      <SectionHeader title="Welcome back, Priya" subtitle="Manage upcoming bookings, invoices, and notifications." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><p className="text-xs text-muted-foreground">Upcoming Bookings</p><p className="mt-2 text-2xl font-bold">06</p></Card>
        <Card><p className="text-xs text-muted-foreground">Completed This Month</p><p className="mt-2 text-2xl font-bold">14</p></Card>
        <Card><p className="text-xs text-muted-foreground">Wishlist</p><p className="mt-2 text-2xl font-bold">09</p></Card>
        <Card><p className="text-xs text-muted-foreground">Reward Points</p><p className="mt-2 text-2xl font-bold">3,240</p></Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h3 className="mb-4 font-semibold">Recent Bookings</h3>
          {bookings.isLoading ? <LoadingGrid count={2} /> : (
            <div className="space-y-3">
              {bookings.data?.map((booking) => (
                <div key={booking.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
                  <div>
                    <p className="font-semibold">{booking.service}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(booking.date)} • {booking.address}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={booking.status === 'Completed' ? 'success' : booking.status === 'Pending' ? 'warning' : 'default'}>{booking.status}</Badge>
                    <Link to={`/customer/bookings/${booking.id}`}><Button variant="outline" size="sm">Details</Button></Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h3 className="mb-4 font-semibold">Notifications</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Provider assigned for booking BK-4501</p>
            <p>Invoice generated for BK-4502</p>
            <p>Price drop on saved service: Wall Painting</p>
          </div>
        </Card>
      </div>
      <section>
        <SectionHeader title="Recommended Services" subtitle="Based on your recent activity." />
        {services.isLoading ? <LoadingGrid /> : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {services.data?.slice(0, 3).map((service) => <ServiceCard key={service.id} service={service} />)}
          </div>
        )}
      </section>
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
          { key: 'id', label: 'Booking ID' },
          { key: 'service', label: 'Service' },
          { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
          { key: 'status', label: 'Status', render: (row) => <Badge variant={row.status === 'Completed' ? 'success' : 'warning'}>{row.status}</Badge> },
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
  const booking = data.find((item) => item.id === id) || data[0]

  if (!booking) return <EmptyState title="No booking found" />

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title={`Booking ${booking.id}`} subtitle="Timeline, provider details, invoice and actions." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h3 className="font-semibold">Booking Details</h3>
          <p className="text-sm text-muted-foreground">Service: {booking.service}</p>
          <p className="text-sm text-muted-foreground">Provider: {booking.provider}</p>
          <p className="text-sm text-muted-foreground">Date: {formatDate(booking.date)}</p>
          <p className="text-sm text-muted-foreground">Address: {booking.address}</p>
        </Card>
        <Card className="space-y-3">
          <h3 className="font-semibold">Actions</h3>
          <Button className="w-full">Reschedule</Button>
          <Button variant="outline" className="w-full">Download Invoice</Button>
          <Button variant="danger" className="w-full">Cancel Booking</Button>
        </Card>
      </div>
      <Card>
        <h3 className="mb-3 font-semibold">Tracking Timeline</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Booking confirmed</p>
          <p>Provider assigned</p>
          <p>Provider en route</p>
          <p>Service in progress</p>
        </div>
      </Card>
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
          { key: 'id', label: 'Invoice ID' },
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
    'Provider has accepted your booking BK-4501',
    'Payment reminder for pending booking',
    'Special 15% discount on Salon services this week',
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
          <p className="font-semibold">Deep Home Cleaning Premium - ₹2499</p>
        </Card>
        <Link to="/customer/booking/payment" className="md:col-span-2"><Button className="w-full">Continue to Payment</Button></Link>
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
        <Link to="/customer/booking/tracking/BK-4501"><Button className="mt-4">Track Booking</Button></Link>
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
        <Link to="/customer/booking/payment"><Button className="mt-4">Retry Payment</Button></Link>
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
          <p className="mt-2 text-sm text-muted-foreground">Rohan Verma - +91 90000 11223</p>
          <Button className="mt-4">Call Provider</Button>
        </Card>
      </div>
    </motion.div>
  )
}
