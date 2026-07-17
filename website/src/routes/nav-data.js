import {
  BadgeIndianRupee,
  Bell,
  Briefcase,
  Calendar,
  CircleUser,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MessageSquareWarning,
  Package,
  Settings,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Wrench,
} from 'lucide-react'

export const customerNav = [
  { label: 'Home', path: '/customer', icon: LayoutDashboard },
  { label: 'Bookings', path: '/customer/bookings', icon: ClipboardList },
]

export const providerNav = [
  { label: 'Home', path: '/provider', icon: LayoutDashboard },
  { label: 'Bookings', path: '/provider/bookings', icon: ClipboardList },
  { label: 'Services', path: '/provider/services', icon: Wrench },
  { label: 'Analytics', path: '/provider/analytics', icon: FileText },
  { label: 'Reviews', path: '/provider/reviews', icon: Sparkles },
  { label: 'Profile', path: '/provider/profile', icon: CircleUser },
]

export const adminNav = [
  { label: 'Home', path: '/sevalink-admin', icon: LayoutDashboard },
  { label: 'Users', path: '/sevalink-admin/users', icon: Users },
  { label: 'Providers', path: '/sevalink-admin/providers', icon: ShieldCheck },
  { label: 'Services', path: '/sevalink-admin/services', icon: Wrench },
  { label: 'Bookings', path: '/sevalink-admin/bookings', icon: ClipboardList },
  { label: 'Reports', path: '/sevalink-admin/reports', icon: Briefcase },
  { label: 'Complaints', path: '/sevalink-admin/complaints', icon: MessageSquareWarning },
  { label: 'Settings', path: '/sevalink-admin/settings', icon: Settings },
]
