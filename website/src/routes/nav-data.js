import {
  BadgeIndianRupee,
  Briefcase,
  Calendar,
  CircleUser,
  ClipboardList,
  FileText,
  Heart,
  LayoutDashboard,
  MessageSquareWarning,
  Package,
  Receipt,
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
  { label: 'Wishlist', path: '/customer/wishlist', icon: Heart },
  { label: 'Invoices', path: '/customer/invoices', icon: Receipt },
  { label: 'Notifications', path: '/customer/notifications', icon: Sparkles },
  { label: 'Profile', path: '/customer/profile', icon: CircleUser },
  { label: 'Settings', path: '/customer/settings', icon: Settings },
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
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Providers', path: '/admin/providers', icon: ShieldCheck },
  { label: 'Categories', path: '/admin/categories', icon: Sparkles },
  { label: 'Services', path: '/admin/services', icon: Wrench },
  { label: 'Bookings', path: '/admin/bookings', icon: ClipboardList },
  { label: 'Payments', path: '/admin/payments', icon: BadgeIndianRupee },
  { label: 'Reports', path: '/admin/reports', icon: Briefcase },
  { label: 'Complaints', path: '/admin/complaints', icon: MessageSquareWarning },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
]
