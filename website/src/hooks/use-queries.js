import { useQuery } from '@tanstack/react-query'
import {
  getAdminStats,
  getBookings,
  getCategories,
  getProviderById,
  getProvidersByService,
  getProviders,
  getServiceById,
  getServices,
  getCustomerBookings,
  getProviderBookings,
  searchServices,
  getServiceReviews,
  getNotifications,
  getConversationByBooking,
  getConversations,
  getMessages,
} from '@/services/supabaseApi'

export function useCategoriesQuery() {
  return useQuery({ queryKey: ['categories'], queryFn: getCategories })
}

export function useServicesQuery() {
  return useQuery({ queryKey: ['services'], queryFn: getServices })
}

export function useServiceQuery(id) {
  return useQuery({
    queryKey: ['service', id],
    queryFn: () => getServiceById(id),
    enabled: Boolean(id),
  })
}

export function useSearchServicesQuery(query) {
  return useQuery({
    queryKey: ['services', 'search', query],
    queryFn: () => searchServices(query),
    enabled: Boolean(query),
  })
}

export function useProvidersQuery() {
  return useQuery({ queryKey: ['providers'], queryFn: getProviders })
}

export function useProvidersByServiceQuery(serviceId) {
  return useQuery({
    queryKey: ['providers', 'service', serviceId],
    queryFn: () => getProvidersByService(serviceId),
    enabled: Boolean(serviceId),
  })
}

export function useProviderQuery(id) {
  return useQuery({
    queryKey: ['provider', id],
    queryFn: () => getProviderById(id),
    enabled: Boolean(id),
  })
}

export function useBookingsQuery() {
  return useQuery({ queryKey: ['bookings'], queryFn: getBookings })
}

export function useCustomerBookingsQuery(customerId) {
  return useQuery({
    queryKey: ['bookings', 'customer', customerId],
    queryFn: () => getCustomerBookings(customerId),
    enabled: Boolean(customerId),
  })
}

export function useProviderBookingsQuery(providerId) {
  return useQuery({
    queryKey: ['bookings', 'provider', providerId],
    queryFn: () => getProviderBookings(providerId),
    enabled: Boolean(providerId),
  })
}

export function useServiceReviewsQuery(serviceId) {
  return useQuery({
    queryKey: ['reviews', serviceId],
    queryFn: () => getServiceReviews(serviceId),
    enabled: Boolean(serviceId),
  })
}

export function useNotificationsQuery(userId) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => getNotifications(userId),
    enabled: Boolean(userId),
  })
}

export function useConversationByBookingQuery(bookingId) {
  return useQuery({
    queryKey: ['conversation', 'booking', bookingId],
    queryFn: () => getConversationByBooking(bookingId),
    enabled: Boolean(bookingId),
  })
}

export function useConversationsQuery(userId) {
  return useQuery({
    queryKey: ['conversations', userId],
    queryFn: () => getConversations(userId),
    enabled: Boolean(userId),
  })
}

export function useMessagesQuery(conversationId) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => getMessages(conversationId),
    enabled: Boolean(conversationId),
  })
}

export function useAdminStatsQuery() {
  return useQuery({ queryKey: ['admin-stats'], queryFn: getAdminStats })
}
