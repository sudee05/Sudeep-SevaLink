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

const formatPrice = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`

const chartMargin = { top: 18, right: 18, left: 18, bottom: 8 }
const axisTick = { fill: '#64748b', fontSize: 12 }

export function RevenueAreaChart({ data }) {
  return (
    <Card className="h-[360px] overflow-hidden p-5 sm:h-[380px]">
      <h3 className="mb-2 text-base font-semibold">Revenue Trend</h3>
      <p className="mb-2 text-xs text-muted-foreground">Monthly price performance</p>
      <ResponsiveContainer width="100%" height="84%">
        <AreaChart data={data} margin={chartMargin}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#2563EB" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={72}
            tickFormatter={(value) => formatPrice(value)}
            // label={{ value: 'Price', angle: -90, position: 'insideLeft', offset: 4, fill: '#64748b' }}
          />
          <Tooltip formatter={(value) => [formatPrice(value), 'Revenue']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
          <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={3} fill="url(#colorRevenue)" dot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }} activeDot={{ r: 6 }} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}

export function BookingBarChart({ data }) {
  return (
    <Card className="h-[360px] overflow-hidden p-5 sm:h-[380px]">
      <h3 className="mb-2 text-base font-semibold">Bookings Volume</h3>
      <p className="mb-2 text-xs text-muted-foreground">Completed and active bookings by month</p>
      <ResponsiveContainer width="100%" height="84%">
        <BarChart data={data} margin={chartMargin}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis dataKey="bookings" tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={34} />
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
          <Bar dataKey="bookings" name="Bookings" fill="#10B981" radius={[8, 8, 0, 0]} maxBarSize={52} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}