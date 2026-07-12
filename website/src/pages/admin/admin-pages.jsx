import { motion } from 'framer-motion'
import { useAdminStatsQuery, useBookingsQuery, useProvidersQuery } from '@/hooks/use-mock-queries'
import { BookingBarChart, RevenueAreaChart } from '@/components/charts/revenue-booking-chart'
import { DataTable } from '@/components/common/data-table'
import { SectionHeader } from '@/components/common/section-header'
import { StatCard } from '@/components/common/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatDate } from '@/utils/format'

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
}

export function AdminDashboardPage() {
  const stats = useAdminStatsQuery()
  const bookings = useBookingsQuery()

  return (
    <motion.div className="space-y-6" {...fade}>
      <SectionHeader title="Admin Home" subtitle="Revenue, bookings, providers and operational activity." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.data?.cards?.map((card) => <StatCard key={card.label} label={card.label} value={card.label === 'Revenue' ? formatCurrency(card.value) : card.value} delta={card.delta} />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <RevenueAreaChart data={stats.data?.trends || []} />
        <BookingBarChart data={stats.data?.trends || []} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <SectionHeader title="Latest Bookings" subtitle="Newest activity in marketplace." />
          <DataTable
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'service', label: 'Service' },
              { key: 'customer', label: 'Customer' },
              { key: 'status', label: 'Status', render: (row) => <Badge variant={row.status === 'Completed' ? 'success' : 'warning'}>{row.status}</Badge> },
            ]}
            rows={(bookings.data || []).slice(0, 3)}
          />
        </Card>
        <Card>
          <SectionHeader title="Recent Activities" subtitle="Internal operations timeline." />
          <div className="space-y-3 text-sm text-muted-foreground">
            {(stats.data?.latestActivities || []).map((item) => (
              <div key={item} className="rounded-xl border border-border p-3">{item}</div>
            ))}
          </div>
        </Card>
      </div>
    </motion.div>
  )
}

export function AdminUsersPage() {
  return <CrudModule title="Users" subtitle="Customer account administration and access controls." />
}

export function AdminProvidersPage() {
  const providers = useProvidersQuery()
  const rows = providers.data || []

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title="Provider Verification" subtitle="Approve, reject, request changes, and inspect documents." action={<Button>Request Changes</Button>} />
      {rows.length ? (
        <DataTable
          columns={[
            { key: 'name', label: 'Provider' },
            { key: 'category', label: 'Category' },
            { key: 'location', label: 'Location' },
            { key: 'verified', label: 'Status', render: (row) => <Badge variant={row.verified ? 'success' : 'warning'}>{row.verified ? 'Approved' : 'Pending'}</Badge> },
            {
              key: 'action',
              label: 'Actions',
              render: () => (
                <div className="flex gap-1">
                  <Button size="sm">Approve</Button>
                  <Button size="sm" variant="outline">Reject</Button>
                </div>
              ),
            },
          ]}
          rows={rows}
        />
      ) : <EmptyState title="No providers pending" />}
    </motion.div>
  )
}

export function AdminCategoriesPage() {
  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title="Category Management" subtitle="Create, edit, delete and publish category listings." action={<Button>Add Category</Button>} />
      <Card className="grid gap-3 md:grid-cols-5">
        <Input className="md:col-span-2" placeholder="Category name" />
        <Input placeholder="Icon" />
        <Select placeholder="Status" options={[{ label: 'Active', value: 'active' }, { label: 'Draft', value: 'draft' }]} />
        <Button>Save</Button>
      </Card>
      <CrudTable />
    </motion.div>
  )
}

export function AdminServicesPage() {
  return <CrudModule title="Services" subtitle="Review listed services and marketplace quality." />
}

export function AdminBookingsPage() {
  const { data = [] } = useBookingsQuery()

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title="Booking Management" subtitle="View, edit, cancel, refund, and assign providers." />
      <DataTable
        columns={[
          { key: 'id', label: 'Booking' },
          { key: 'service', label: 'Service' },
          { key: 'customer', label: 'Customer' },
          { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
          { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount) },
          { key: 'action', label: 'Action', render: () => <Button size="sm" variant="outline">Edit</Button> },
        ]}
        rows={data}
      />
    </motion.div>
  )
}

export function AdminPaymentsPage() {
  return <CrudModule title="Payments" subtitle="Transactions, refunds, invoices and revenue controls." />
}

export function AdminReportsPage() {
  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title="Reports" subtitle="Growth, revenue, categories, providers and customer insights." />
      <div className="grid gap-4 xl:grid-cols-2">
        <RevenueAreaChart data={[
          { month: 'Jan', revenue: 920000, bookings: 2800 },
          { month: 'Feb', revenue: 1000000, bookings: 2950 },
          { month: 'Mar', revenue: 1110000, bookings: 3210 },
          { month: 'Apr', revenue: 1190000, bookings: 3550 },
          { month: 'May', revenue: 1280000, bookings: 3780 },
          { month: 'Jun', revenue: 1360000, bookings: 3980 },
        ]} />
        <Card className="space-y-2">
          <h3 className="font-semibold">Top Insights</h3>
          <p className="text-sm text-muted-foreground">Cleaning category grew 22% MoM.</p>
          <p className="text-sm text-muted-foreground">Provider acceptance SLA improved by 17%.</p>
          <p className="text-sm text-muted-foreground">Customer repeat bookings crossed 63%.</p>
        </Card>
      </div>
    </motion.div>
  )
}

export function AdminComplaintsPage() {
  return <CrudModule title="Complaints" subtitle="Review escalations, quality issues, and resolution timelines." />
}

export function AdminSettingsPage() {
  return <CrudModule title="Admin Settings" subtitle="Permissions, platform policies, and notification controls." />
}

function CrudModule({ title, subtitle }) {
  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title={title} subtitle={subtitle} />
      <Card className="grid gap-3 md:grid-cols-4">
        <Input className="md:col-span-2" placeholder={`Search ${title}`} />
        <Select placeholder="Filter" options={[{ label: 'All', value: 'all' }]} />
        <Button>New</Button>
      </Card>
      <CrudTable />
    </motion.div>
  )
}

function CrudTable() {
  const rows = [
    { name: 'Home Cleaning', status: 'Active', updatedBy: 'Admin', updatedOn: '2026-07-11' },
    { name: 'Salon At Home', status: 'Active', updatedBy: 'Manager', updatedOn: '2026-07-10' },
  ]

  return (
    <DataTable
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'status', label: 'Status', render: (row) => <Badge variant={row.status === 'Active' ? 'success' : 'warning'}>{row.status}</Badge> },
        { key: 'updatedBy', label: 'Updated By' },
        { key: 'updatedOn', label: 'Updated On' },
        { key: 'action', label: 'Action', render: () => <Button size="sm" variant="outline">Edit</Button> },
      ]}
      rows={rows}
    />
  )
}
