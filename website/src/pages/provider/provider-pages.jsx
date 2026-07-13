import { motion } from 'framer-motion'
import { Calendar, CheckCircle2, CircleDollarSign, Clock, Plus } from 'lucide-react'
import { useBookingsQuery, useServicesQuery } from '@/hooks/use-queries'
import { BookingBarChart, RevenueAreaChart } from '@/components/charts/revenue-booking-chart'
import { DataTable } from '@/components/common/data-table'
import { SectionHeader } from '@/components/common/section-header'
import { StatCard } from '@/components/common/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
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
  const { data = [] } = useServicesQuery()

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title="Services" subtitle="Create, update pricing, and availability." action={<Button><Plus className="h-4 w-4" /> New Service</Button>} />
      <Card className="grid gap-3 md:grid-cols-2">
        <Input placeholder="Service title" />
        <Input type="number" placeholder="Pricing" />
        <Select placeholder="Category" options={[{ label: 'Cleaning', value: 'cleaning' }]} />
        <Select placeholder="Availability" options={[{ label: 'Weekdays', value: 'weekdays' }]} />
        <Textarea className="md:col-span-2" placeholder="Description" />
        <Button className="md:col-span-2">Save Service</Button>
      </Card>
      <DataTable
        columns={[
          { key: 'title', label: 'Service' },
          { key: 'category', label: 'Category' },
          { key: 'price', label: 'Price', render: (row) => formatCurrency(row.price) },
          { key: 'edit', label: 'Edit', render: () => <Button size="sm" variant="outline">Edit</Button> },
          { key: 'delete', label: 'Delete', render: () => <Button size="sm" variant="danger">Delete</Button> },
        ]}
        rows={data}
      />
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
