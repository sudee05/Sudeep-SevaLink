import {
  Briefcase,
  Brush,
  Car,
  Drill,
  Home,
  Scissors,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react'

export const mockCategories = [
  { id: 1, name: 'Home Cleaning', icon: Sparkles, services: 120, color: 'bg-sky-100 text-sky-700' },
  { id: 2, name: 'Salon At Home', icon: Scissors, services: 86, color: 'bg-rose-100 text-rose-700' },
  { id: 3, name: 'Repairs', icon: Wrench, services: 240, color: 'bg-amber-100 text-amber-700' },
  { id: 4, name: 'Painting', icon: Brush, services: 65, color: 'bg-emerald-100 text-emerald-700' },
  { id: 5, name: 'Driver Services', icon: Car, services: 48, color: 'bg-indigo-100 text-indigo-700' },
  { id: 6, name: 'Appliance Install', icon: Drill, services: 110, color: 'bg-fuchsia-100 text-fuchsia-700' },
]

export const mockServices = [
  {
    id: 101,
    title: 'Deep Home Cleaning Premium',
    category: 'Home Cleaning',
    location: 'Bengaluru',
    price: 2499,
    rating: 5,
    reviews: 1240,
    providerId: 1,
    verified: true,
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1400&q=80',
    description: '8-hour deep cleaning package for full homes with sanitization and eco-safe materials.',
  },
  {
    id: 102,
    title: 'Women Haircut & Styling Pro',
    category: 'Salon At Home',
    location: 'Mumbai',
    price: 999,
    rating: 4,
    reviews: 842,
    providerId: 2,
    verified: true,
    image: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1400&q=80',
    description: 'Certified stylist with personalized consultation and trend-first finishing options.',
  },
  {
    id: 103,
    title: 'AC Service & Gas Refill',
    category: 'Repairs',
    location: 'Delhi',
    price: 1499,
    rating: 5,
    reviews: 2143,
    providerId: 3,
    verified: true,
    image: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=1400&q=80',
    description: 'Fast AC repair and maintenance with doorstep diagnostic, parts replacement, and warranty.',
  },
  {
    id: 104,
    title: 'Express Wall Painting',
    category: 'Painting',
    location: 'Hyderabad',
    price: 4599,
    rating: 4,
    reviews: 652,
    providerId: 4,
    verified: false,
    image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1400&q=80',
    description: 'Color consultation, premium paint options, and compact project delivery for apartments.',
  },
  {
    id: 105,
    title: 'Hourly Driver On Demand',
    category: 'Driver Services',
    location: 'Pune',
    price: 499,
    rating: 5,
    reviews: 438,
    providerId: 5,
    verified: true,
    image: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1400&q=80',
    description: 'Verified drivers for local commutes and business travel with real-time support.',
  },
  {
    id: 106,
    title: 'Smart TV Installation Setup',
    category: 'Appliance Install',
    location: 'Chennai',
    price: 699,
    rating: 4,
    reviews: 511,
    providerId: 6,
    verified: true,
    image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=1400&q=80',
    description: 'Secure mounting, cable management, and setup with all major smart TV brands.',
  },
]

export const mockProviders = [
  {
    id: 1,
    name: 'SparkNest Pro Services',
    category: 'Cleaning & Sanitization',
    rating: 4.9,
    jobs: 2400,
    experience: '7 years',
    verified: true,
    about: 'Trusted partner for deep residential and office cleaning.',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
    certificates: ['ISO Hygiene Certification', 'Urban Excellence Award'],
    location: 'Bengaluru',
  },
  {
    id: 2,
    name: 'LuxeLook Studio',
    category: 'Salon & Grooming',
    rating: 4.8,
    jobs: 1700,
    experience: '5 years',
    verified: true,
    about: 'Personal grooming specialists with premium products.',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
    certificates: ['CIDESCO Certified', 'Advanced Beauty Academy'],
    location: 'Mumbai',
  },
  {
    id: 3,
    name: 'FixFast Mechanicals',
    category: 'AC & Appliance Repair',
    rating: 4.9,
    jobs: 3100,
    experience: '9 years',
    verified: true,
    about: 'Rapid response team for complex appliance issues.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    certificates: ['HVAC Master License', 'Safety Compliance Level 3'],
    location: 'Delhi',
  },
]

export const mockBookings = [
  {
    id: 'BK-4501',
    service: 'Deep Home Cleaning Premium',
    customer: 'Priya Sharma',
    provider: 'SparkNest Pro Services',
    date: '2026-07-14T10:30:00',
    status: 'Pending',
    amount: 2499,
    address: 'HSR Layout, Bengaluru',
  },
  {
    id: 'BK-4502',
    service: 'AC Service & Gas Refill',
    customer: 'Rahul Verma',
    provider: 'FixFast Mechanicals',
    date: '2026-07-13T12:00:00',
    status: 'Confirmed',
    amount: 1499,
    address: 'Dwarka, Delhi',
  },
  {
    id: 'BK-4503',
    service: 'Women Haircut & Styling Pro',
    customer: 'Sneha Nair',
    provider: 'LuxeLook Studio',
    date: '2026-07-15T15:30:00',
    status: 'Completed',
    amount: 999,
    address: 'Andheri West, Mumbai',
  },
]

export const mockTestimonials = [
  {
    id: 1,
    quote: 'Booking and tracking felt as smooth as ordering a cab. Premium experience.',
    author: 'Ananya Kapoor',
    role: 'Customer, Bengaluru',
  },
  {
    id: 2,
    quote: 'My provider dashboard gives me bookings, earnings, and reviews in one place.',
    author: 'Mohit Arora',
    role: 'Service Provider',
  },
  {
    id: 3,
    quote: 'The operations dashboard is clean and powerful. Team productivity has improved.',
    author: 'Nisha Jain',
    role: 'Admin Lead',
  },
]

export const mockFaqs = [
  {
    q: 'How does SevaLink verify providers?',
    a: 'Providers complete KYC, document review, and category-specific compliance checks before activation.',
  },
  {
    q: 'Can I reschedule a booking?',
    a: 'Yes, you can reschedule directly from booking details up to 2 hours before the slot.',
  },
  {
    q: 'What if I am not satisfied?',
    a: 'Raise a support ticket in app. Our quality team reviews photos, notes, and refunds where eligible.',
  },
]

export const landingStats = [
  { label: 'Active Providers', value: '8,200+' },
  { label: 'Cities Served', value: '42' },
  { label: 'Bookings Completed', value: '1.9M+' },
  { label: 'Average Rating', value: '4.8/5' },
]

export const providerRegistrationSteps = [
  'Basic Details',
  'Business Information',
  'Address',
  'Documents',
  'Bank Details',
  'Categories',
  'Services',
  'Pricing',
  'Portfolio',
  'Submit',
]

export const adminNav = [
  { label: 'Dashboard', path: '/admin', icon: Home },
  { label: 'Users', path: '/admin/users', icon: Briefcase },
  { label: 'Providers', path: '/admin/providers', icon: ShieldCheck },
  { label: 'Categories', path: '/admin/categories', icon: Sparkles },
  { label: 'Services', path: '/admin/services', icon: Wrench },
  { label: 'Bookings', path: '/admin/bookings', icon: Home },
  { label: 'Payments', path: '/admin/payments', icon: Car },
  { label: 'Reports', path: '/admin/reports', icon: Brush },
]

export const mockAdminStats = {
  cards: [
    { label: 'Revenue', value: 12450000, delta: '+14.2%' },
    { label: 'Bookings', value: 38210, delta: '+9.8%' },
    { label: 'Customers', value: 18990, delta: '+6.1%' },
    { label: 'Providers', value: 8200, delta: '+3.4%' },
  ],
  trends: [
    { month: 'Jan', revenue: 820000, bookings: 2400 },
    { month: 'Feb', revenue: 920000, bookings: 2650 },
    { month: 'Mar', revenue: 990000, bookings: 2900 },
    { month: 'Apr', revenue: 1080000, bookings: 3200 },
    { month: 'May', revenue: 1150000, bookings: 3450 },
    { month: 'Jun', revenue: 1250000, bookings: 3800 },
  ],
  latestActivities: [
    'Provider #PR-882 approved by verification team',
    'Refund requested for booking BK-4501',
    'New category proposal: Pet Care Services',
    'Critical complaint resolved in 42 minutes',
  ],
}
