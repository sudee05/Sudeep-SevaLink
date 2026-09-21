import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '@/components/ui/card'

export function RevenueAreaChart({ data }) {
  return (
    <Card className="h-80">
      <h3 className="mb-4 text-base font-semibold">Revenue Trend</h3>
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart data={data} layout="vertical">
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="1" y2="0">
              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#2563EB" stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="revenue" />
          <YAxis type="category" dataKey="month" />
          <Tooltip />
          <Area type="monotone" dataKey="revenue" stroke="#2563EB" fill="url(#colorRevenue)" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}
export function BookingBarChart({ data }) {
  return (
    <Card className="h-80">
      <h3 className="mb-4 text-base font-semibold">Bookings Volume</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="bookings" />
          <YAxis type="category" dataKey="month" />
          <Tooltip />
          <Legend />
          <Bar dataKey="bookings" fill="#10B981" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
