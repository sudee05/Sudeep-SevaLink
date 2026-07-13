import { Navigate, Route, Routes } from 'react-router-dom'
import { PublicLayout } from '@/layouts/public-layout'
import { AuthLayout } from '@/layouts/auth-layout'
import { CustomerLayout } from '@/layouts/customer-layout'
import { ProviderLayout } from '@/layouts/provider-layout'
import { AdminLayout } from '@/layouts/admin-layout'
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
  AdminForgotPasswordPage,
  AdminLoginPage,
  CustomerLoginPage,
  CustomerRegisterPage,
  EmailVerificationPage,
  ForgotPasswordPage,
  OtpPage,
  ProviderApplicationSubmittedPage,
  ProviderApprovedPage,
  ProviderForgotPasswordPage,
  ProviderLoginPage,
  ProviderPendingApprovalPage,
  ProviderRegisterPage,
  ProviderRejectedPage,
  ResetPasswordPage,
} from '@/pages/auth/auth-pages'
import {
  BookingFailedPage,
  BookingNewPage,
  BookingPaymentPage,
  BookingSuccessPage,
  BookingTrackingPage,
  CustomerBookingDetailsPage,
  CustomerBookingsPage,
  CustomerDashboardPage,
  CustomerInvoicesPage,
  CustomerNotificationsPage,
  CustomerProfilePage,
  CustomerSettingsPage,
  CustomerWishlistPage,
} from '@/pages/customer/customer-pages'
import {
  ProviderAnalyticsPage,
  ProviderBookingsPage,
  ProviderCalendarPage,
  ProviderDashboardPage,
  ProviderPackagesPage,
  ProviderPaymentsPage,
  ProviderProfilePage,
  ProviderReviewsPage,
  ProviderServicesPage,
  ProviderSettingsPage,
  ProviderVehiclesPage,
} from '@/pages/provider/provider-pages'
import {
  AdminBookingsPage,
  AdminCategoriesPage,
  AdminComplaintsPage,
  AdminDashboardPage,
  AdminPaymentsPage,
  AdminProvidersPage,
  AdminReportsPage,
  AdminServicesPage,
  AdminSettingsPage,
  AdminUsersPage,
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

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
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

        <Route path="/provider/login" element={<ProviderLoginPage />} />
        <Route path="/provider/register" element={<ProviderRegisterPage />} />
        <Route path="/provider/forgot-password" element={<ProviderForgotPasswordPage />} />
        <Route path="/provider/application-submitted" element={<ProviderApplicationSubmittedPage />} />
        <Route path="/provider/pending" element={<ProviderPendingApprovalPage />} />
        <Route path="/provider/rejected" element={<ProviderRejectedPage />} />
        <Route path="/provider/approved" element={<ProviderApprovedPage />} />

        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/forgot-password" element={<AdminForgotPasswordPage />} />
      </Route>

      <Route path="/customer" element={<CustomerLayout />}>
        <Route index element={<CustomerDashboardPage />} />
        <Route path="bookings" element={<CustomerBookingsPage />} />
        <Route path="bookings/:id" element={<CustomerBookingDetailsPage />} />
        <Route path="wishlist" element={<CustomerWishlistPage />} />
        <Route path="notifications" element={<CustomerNotificationsPage />} />
        <Route path="invoices" element={<CustomerInvoicesPage />} />
        <Route path="profile" element={<CustomerProfilePage />} />
        <Route path="settings" element={<CustomerSettingsPage />} />
        <Route path="booking/new" element={<BookingNewPage />} />
        <Route path="booking/payment" element={<BookingPaymentPage />} />
        <Route path="booking/success" element={<BookingSuccessPage />} />
        <Route path="booking/failed" element={<BookingFailedPage />} />
        <Route path="booking/tracking/:id" element={<BookingTrackingPage />} />
      </Route>

      <Route path="/provider" element={<ProviderLayout />}>
        <Route index element={<ProviderDashboardPage />} />
        <Route path="bookings" element={<ProviderBookingsPage />} />
        <Route path="services" element={<ProviderServicesPage />} />
        <Route path="vehicles" element={<ProviderVehiclesPage />} />
        <Route path="packages" element={<ProviderPackagesPage />} />
        <Route path="calendar" element={<ProviderCalendarPage />} />
        <Route path="analytics" element={<ProviderAnalyticsPage />} />
        <Route path="payments" element={<ProviderPaymentsPage />} />
        <Route path="reviews" element={<ProviderReviewsPage />} />
        <Route path="profile" element={<ProviderProfilePage />} />
        <Route path="settings" element={<ProviderSettingsPage />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="providers" element={<AdminProvidersPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="services" element={<AdminServicesPage />} />
        <Route path="bookings" element={<AdminBookingsPage />} />
        <Route path="payments" element={<AdminPaymentsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="complaints" element={<AdminComplaintsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
