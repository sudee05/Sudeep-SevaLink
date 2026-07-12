import { useQuery } from '@tanstack/react-query'
import {
  getAdminStats,
  getBookings,
  getCategories,
  getProviderById,
  getProviders,
  getServiceById,
  getServices,
} from '@/services/mockApi'

export function useCategoriesQuery() {
  return useQuery({ queryKey: ['categories'], queryFn: getCategories })
}

export function useServicesQuery() {
  return useQuery({ queryKey: ['services'], queryFn: getServices })
}

export function useServiceQuery(id) {
  return useQuery({ queryKey: ['service', id], queryFn: () => getServiceById(id), enabled: Boolean(id) })
}

export function useProvidersQuery() {
  return useQuery({ queryKey: ['providers'], queryFn: getProviders })
}

export function useProviderQuery(id) {
  return useQuery({ queryKey: ['provider', id], queryFn: () => getProviderById(id), enabled: Boolean(id) })
}

export function useBookingsQuery() {
  return useQuery({ queryKey: ['bookings'], queryFn: getBookings })
}

export function useAdminStatsQuery() {
  return useQuery({ queryKey: ['admin-stats'], queryFn: getAdminStats })
}
