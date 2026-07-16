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

export async function getAdminCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── Services (master catalog — admin-managed) ─────────────────

export async function getServices() {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, description')
    .order('name')
  if (error) throw error
  return data
}

export async function getAdminServices() {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, description')
    .order('name')
  if (error) throw error
  return data
}

export async function createService(payload) {
  const { data, error } = await supabase
    .from('services')
    .insert({ name: payload.name, description: payload.description })
    .select('id, name, description')
    .single()
  if (error) throw error
  return data
}

export async function updateService(id, payload) {
  const { data, error } = await supabase
    .from('services')
    .update({ name: payload.name, description: payload.description })
    .eq('id', id)
    .select('id, name, description')
    .single()
  if (error) throw error
  return data
}

export async function deleteService(id) {
  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) throw error
}

// ── Provider Services (enrollment) ────────────────────────────

export async function getProviderServices(providerId) {
  // Returns service IDs the provider has enrolled in
  const { data, error } = await supabase
    .from('provider_services')
    .select('service_id')
    .eq('provider_id', providerId)
  if (error) throw error
  return (data || []).map((r) => r.service_id)
}

export async function setProviderServices(providerId, serviceIds) {
  // Replace all enrollments for this provider
  // 1. Delete existing
  await supabase.from('provider_services').delete().eq('provider_id', providerId)
  if (!serviceIds.length) return
  // 2. Insert new
  const rows = serviceIds.map((service_id) => ({ provider_id: providerId, service_id }))
  const { error } = await supabase.from('provider_services').insert(rows)
  if (error) throw error
}

// ── Service Requests (provider requests new service type) ──────

export async function submitServiceRequest(providerId, { userId, phone, serviceName, name, description }) {
  const { error } = await supabase
    .from('service_requests')
    .insert({
      provider_id: providerId || null,
      user_id: userId || null,
      phone: phone || '',
      service_name: serviceName || name,
      description,
      status: 'pending',
    })
  if (error) throw error
}

export async function getServiceRequests() {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*, profiles(full_name), providers(business_name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function updateServiceRequestStatus(id, status) {
  const { error } = await supabase
    .from('service_requests')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

// (legacy stubs kept so other pages don't break)
export async function getServiceById(id) {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, description')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}
export async function getServicesByCategory() { return [] }
export async function searchServices() { return [] }

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

export async function getProvidersByService(serviceId) {
  if (!serviceId) return []

  const { data, error } = await supabase
    .from('provider_services')
    .select('providers(*)')
    .eq('service_id', serviceId)
  if (error) throw error

  return (data || [])
    .map((row) => row.providers)
    .filter(Boolean)
    .filter((provider) => provider.verified)
    .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))
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
  // Query profiles with role='provider' — this shows ALL provider users
  // even if they haven't completed their business profile yet.
  const { data, error } = await supabase
    .from('profiles')
    .select('*, providers(id, business_name, category, location, rating, verified, status)')
    .eq('role', 'provider')
    .order('created_at', { ascending: false })
  if (error) throw error

  return (data || []).map((p) => {
    // providers can be an array (one-to-many) or null
    const biz = Array.isArray(p.providers) ? p.providers[0] : p.providers
    return {
      ...p,
      // Expose profile ID clearly for approval actions
      profile_id: p.id,
      // Business info from providers table (may be absent if not yet filled)
      provider_record_id: biz?.id || null,
      business_name: biz?.business_name || p.full_name || '-',
      location: biz?.location || '-',
      rating: biz?.rating || 0,
      verified: biz?.verified || false,
      owner_name: p.full_name || '-',
      owner_phone: p.phone || '-',
      // approval_status is on the profile row itself
      approval_status: p.approval_status || 'pending',
    }
  })
}

export async function updateProviderApproval(profileId, providerRecordId, status) {
  // Update profiles.approval_status
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ approval_status: status })
    .eq('id', profileId)
  if (profileError) throw profileError

  // Sync providers.verified + status if business profile exists
  if (providerRecordId) {
    const providerStatus =
      status === 'approved' ? 'approved'
      : status === 'denied'   ? 'rejected'
      : 'pending'
    const { error: providerError } = await supabase
      .from('providers')
      .update({ verified: status === 'approved', status: providerStatus })
      .eq('id', providerRecordId)
    if (providerError) throw providerError
  }

  return { profileId, status }
}

function normalizeBooking(booking) {
  return {
    ...booking,
    customer_name: booking.customer?.full_name || booking.customer_name || '-',
    customer_phone: booking.customer?.phone || booking.customer_phone || '-',
    provider_name: booking.provider?.business_name || booking.provider_name || '-',
    service_title: booking.service?.name || booking.service_title || '-',
    customer: booking.customer?.full_name || booking.customer_name || '-',
    provider: booking.provider?.business_name || booking.provider_name || '-',
    service: booking.service?.name || booking.service_title || '-',
    date: booking.scheduled_date || booking.booking_date || booking.created_at,
  }
}


export async function getAdminUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getAdminComplaints() {
  const { data, error } = await supabase
    .from('booking_complaints')
    .select('*, profiles(full_name), services(name), providers(business_name), bookings(booking_code)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── Bookings ──────────────────────────────────────────────────

export async function getBookings() {
  // Try with joins first; fall back to plain select if FK aliases aren't set up
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(
        `*,
        customer:profiles!bookings_customer_id_fkey(full_name, phone),
        provider:providers!bookings_provider_id_fkey(business_name),
        service:services!bookings_service_id_fkey(name)`
      )
      .order('created_at', { ascending: false })
    if (!error) {
      return (data || []).map(normalizeBooking)
    }
  } catch {
    // fall through to plain select
  }
  // Fallback: plain select (no joins)
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(normalizeBooking)
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
    .select('*, provider:providers!bookings_provider_id_fkey(business_name), service:services!bookings_service_id_fkey(name)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(normalizeBooking)
}

export async function getProviderBookings(providerId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, customer:profiles!bookings_customer_id_fkey(full_name, phone), service:services!bookings_service_id_fkey(name)')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(normalizeBooking)
}

export async function createBooking(booking) {
  const scheduledDate = booking.scheduled_date || `${booking.booking_date}T${booking.booking_time || '09:00'}:00`
  const { data, error } = await supabase
    .from('bookings')
    .insert({ ...booking, scheduled_date: scheduledDate })
    .select()
    .single()
  if (error) throw error
  return normalizeBooking(data)
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

export async function createBookingFeedback(feedback) {
  const { data, error } = await supabase
    .from('booking_feedback')
    .insert(feedback)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createBookingComplaint(complaint) {
  const { data, error } = await supabase
    .from('booking_complaints')
    .insert(complaint)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getProviderFeedback(providerId) {
  const { data, error } = await supabase
    .from('booking_feedback')
    .select('*, profiles(full_name), bookings(booking_code, service_title)')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
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
