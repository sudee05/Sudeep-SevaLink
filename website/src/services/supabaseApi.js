import { supabase } from '@/lib/supabase'

// ── Categories ────────────────────────────────────────────────

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

// ── Services ──────────────────────────────────────────────────

export async function getServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*, categories(name), providers(business_name, verified)')
    .eq('active', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getServiceById(id) {
  const { data, error } = await supabase
    .from('services')
    .select('*, categories(name), providers(id, business_name, rating, verified, image_url, location)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getServicesByCategory(categoryId) {
  const { data, error } = await supabase
    .from('services')
    .select('*, categories(name), providers(business_name, verified)')
    .eq('category_id', categoryId)
    .eq('active', true)
    .order('rating', { ascending: false })
  if (error) throw error
  return data
}

export async function searchServices(query) {
  const { data, error } = await supabase
    .from('services')
    .select('*, categories(name), providers(business_name, verified)')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .eq('active', true)
  if (error) throw error
  return data
}

// ── Providers ─────────────────────────────────────────────────

export async function getProviders() {
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('verified', true)
    .order('rating', { ascending: false })
  if (error) throw error
  return data
}

export async function getProviderById(id) {
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getAllProviders() {
  // Admin-only: returns all providers regardless of verification
  const { data, error } = await supabase
    .from('providers')
    .select('*, profiles(full_name, phone)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── Bookings ──────────────────────────────────────────────────

export async function getBookings() {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getBookingById(id) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getCustomerBookings(customerId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getProviderBookings(providerId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createBooking(booking) {
  const { data, error } = await supabase
    .from('bookings')
    .insert(booking)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBookingStatus(id, status) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Reviews ───────────────────────────────────────────────────

export async function getServiceReviews(serviceId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profiles(full_name, avatar_url)')
    .eq('service_id', serviceId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createReview(review) {
  const { data, error } = await supabase
    .from('reviews')
    .insert(review)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Admin Stats ───────────────────────────────────────────────

export async function getAdminStats() {
  const [
    { count: totalBookings },
    { count: totalCustomers },
    { count: totalProviders },
    { data: recentBookings },
  ] = await Promise.all([
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('providers').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('amount').order('created_at', { ascending: false }).limit(100),
  ])

  const totalRevenue = (recentBookings || []).reduce((sum, b) => sum + Number(b.amount), 0)

  return {
    cards: [
      { label: 'Revenue', value: totalRevenue, delta: '' },
      { label: 'Bookings', value: totalBookings || 0, delta: '' },
      { label: 'Customers', value: totalCustomers || 0, delta: '' },
      { label: 'Providers', value: totalProviders || 0, delta: '' },
    ],
    trends: [],
    latestActivities: [],
  }
}

// ── Profile ───────────────────────────────────────────────────

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Notifications ─────────────────────────────────────────────

export async function getNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function markNotificationRead(id) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
  if (error) throw error
}
