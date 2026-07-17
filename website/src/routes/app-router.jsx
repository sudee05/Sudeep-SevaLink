import { Navigate, Route, Routes } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { PublicLayout } from '@/layouts/public-layout'
import { AuthLayout } from '@/layouts/auth-layout'
import { CustomerLayout } from '@/layouts/customer-layout'
import { ProviderLayout } from '@/layouts/provider-layout'
import { AdminLayout } from '@/layouts/admin-layout'
import { ProtectedRoute } from '@/components/common/protected-route'
import { selectAuthLoading, selectIsAuthenticated, selectUserRole } from '@/store/authSlice'
import {
  CategoriesPage,
  LandingPage,
  ProviderDetailsPage,
  ProvidersPage,
  SearchPage,
  ServiceDetailsPage,
  ServicesPage,
} from '@/pages/public/public-pages'
import {
  CustomerLoginPage,
  CustomerRegisterPage,
  EmailVerificationPage,
  ForgotPasswordPage,
  OtpPage,
  ResetPasswordPage,
} from '@/pages/auth/auth-pages'
import {
  BookingFailedPage,
  BookingPaymentPage,
  BookingSuccessPage,
  BookingTrackingPage,
  CustomerBookingDetailsPage,
  CustomerBookingsPage,
  CustomerDashboardPage,
  CustomerNotificationsPage,
  CustomerProfilePage,
} from '@/pages/customer/customer-pages'
import {
  ProviderAnalyticsPage,
  ProviderBookingDetailsPage,
  ProviderBookingsPage,
  ProviderDashboardPage,
  ProviderNotificationsPage,
  ProviderProfilePage,
  ProviderReviewsPage,
  ProviderServicesPage,
} from '@/pages/provider/provider-pages'
import {
  AdminBookingsPage,
  AdminDashboardPage,
  AdminProvidersPage,
  AdminReportsPage,
  AdminSectionPage,
  AdminServicesPage,
} from '@/pages/admin/admin-pages'
import { Button } from '@/components/ui/button'

function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center">
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-bold">Page not found</h1>
        <Button onClick={() => window.history.back()}>Go Back</Button>
      </div>
    </div>
  )
}

function LandingRoute() {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const loading = useSelector(selectAuthLoading)
  const role = useSelector(selectUserRole)

  if (!loading && isAuthenticated) {
    if (role === 'customer') return <Navigate to="/customer" replace />
    if (role === 'provider') return <Navigate to="/provider" replace />
  }

  return <LandingPage />
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/providers" element={<ProvidersPage />} />
        <Route path="/provider/:id" element={<ProviderDetailsPage />} />
        <Route path="/service/:id" element={<ServiceDetailsPage />} />
        <Route path="/search" element={<SearchPage />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<CustomerLoginPage />} />
        <Route path="/register" element={<CustomerRegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/otp" element={<OtpPage />} />
        <Route path="/verify-email" element={<EmailVerificationPage />} />
      </Route>

      {/* Customer Portal — protected, requires "customer" role */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute allowedRoles={['customer', 'admin']}>
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CustomerDashboardPage />} />
        <Route path="bookings" element={<CustomerBookingsPage />} />
        <Route path="bookings/:id" element={<CustomerBookingDetailsPage />} />
        <Route path="booking/:id" element={<CustomerBookingDetailsPage />} />
        <Route path="notifications" element={<CustomerNotificationsPage />} />
        <Route path="profile" element={<CustomerProfilePage />} />
        <Route path="booking/payment" element={<BookingPaymentPage />} />
        <Route path="booking/success" element={<BookingSuccessPage />} />
        <Route path="booking/failed" element={<BookingFailedPage />} />
        <Route path="booking/tracking/:id" element={<BookingTrackingPage />} />
      </Route>

      {/* Provider Portal — protected, requires "provider" role */}
      <Route
        path="/provider"
        element={
          <ProtectedRoute allowedRoles={['provider', 'admin']}>
            <ProviderLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ProviderDashboardPage />} />
        <Route path="bookings" element={<ProviderBookingsPage />} />
        <Route path="bookings/:id" element={<ProviderBookingDetailsPage />} />
        <Route path="services" element={<ProviderServicesPage />} />
        <Route path="analytics" element={<ProviderAnalyticsPage />} />
        <Route path="reviews" element={<ProviderReviewsPage />} />
        <Route path="notifications" element={<ProviderNotificationsPage />} />
        <Route path="profile" element={<ProviderProfilePage />} />
      </Route>

      {/* Admin Console — protected, requires "admin" role */}
      <Route
        path="/sevalink-admin"
        element={
          <ProtectedRoute allowedRoles="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="services" element={<AdminServicesPage />} />
        <Route path="bookings" element={<AdminBookingsPage />} />
        <Route path="providers" element={<AdminProvidersPage />} />
        <Route path=":section" element={<AdminSectionPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
