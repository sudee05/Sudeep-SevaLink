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
    <Card className="flex h-[400px] flex-col">
      <h3 className="mb-4 text-lg font-semibold">Revenue Trend</h3>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 8 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.55} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#d1d5db" strokeDasharray="3 3" />
            <XAxis dataKey="month" tickLine={false} />
            <YAxis width={88} tickLine={false} tickFormatter={(value) => Number(value).toLocaleString('en-IN')} />
            <Tooltip />
            <Area type="monotone" dataKey="revenue" stroke="#2563EB" fill="url(#colorRevenue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export function BookingBarChart({ data }) {
  return (
    <Card className="flex h-[400px] flex-col">
      <h3 className="mb-4 text-lg font-semibold">Bookings Volume</h3>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid stroke="#d1d5db" strokeDasharray="3 3" />
            <XAxis dataKey="month" tickLine={false} />
            <YAxis allowDecimals={false} tickLine={false} />
            <Tooltip />
            <Legend verticalAlign="bottom" height={28} />
            <Bar dataKey="bookings" name="bookings" fill="#10B981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
