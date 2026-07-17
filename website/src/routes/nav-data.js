import {
  BadgeIndianRupee,
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
  { label: 'Dashboard', path: '/customer', icon: LayoutDashboard },
  { label: 'Bookings', path: '/customer/bookings', icon: ClipboardList },
]

export const providerNav = [
  { label: 'Dashboard', path: '/provider', icon: LayoutDashboard },
  { label: 'Bookings', path: '/provider/bookings', icon: ClipboardList },
  { label: 'Services', path: '/provider/services', icon: Wrench },
  { label: 'Vehicles', path: '/provider/vehicles', icon: Truck },
  { label: 'Packages', path: '/provider/packages', icon: Package },
  { label: 'Calendar', path: '/provider/calendar', icon: Calendar },
  { label: 'Analytics', path: '/provider/analytics', icon: FileText },
  { label: 'Payments', path: '/provider/payments', icon: BadgeIndianRupee },
  { label: 'Reviews', path: '/provider/reviews', icon: Sparkles },
  { label: 'Profile', path: '/provider/profile', icon: CircleUser },
  { label: 'Settings', path: '/provider/settings', icon: Settings },
]

export const adminNav = [
  { label: 'Dashboard', path: '/sevalink-admin', icon: LayoutDashboard },
  { label: 'Users', path: '/sevalink-admin/users', icon: Users },
  { label: 'Providers', path: '/sevalink-admin/providers', icon: ShieldCheck },
  { label: 'Services', path: '/sevalink-admin/services', icon: Wrench },
  { label: 'Bookings', path: '/sevalink-admin/bookings', icon: ClipboardList },
  { label: 'Reports', path: '/sevalink-admin/reports', icon: Briefcase },
  { label: 'Complaints', path: '/sevalink-admin/complaints', icon: MessageSquareWarning },
  { label: 'Settings', path: '/sevalink-admin/settings', icon: Settings },
]
