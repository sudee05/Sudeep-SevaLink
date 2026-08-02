import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_providers.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/auth/forgot_password_screen.dart';
import '../screens/auth/email_verification_screen.dart';
import '../screens/customer/customer_shell.dart';
import '../screens/customer/dashboard_screen.dart';
import '../screens/customer/bookings_screen.dart';
import '../screens/customer/booking_detail_screen.dart';
import '../screens/customer/notifications_screen.dart';
import '../screens/customer/profile_screen.dart';
import '../screens/customer/payment_screen.dart';
import '../screens/customer/booking_success_screen.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

GoRouter buildRouter(WidgetRef ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: authState.isAuthenticated ? '/customer' : '/login',
    redirect: (context, state) {
      final isAuth = authState.isAuthenticated;
      final isLoading = authState.isLoading;
      final path = state.uri.path;

      if (isLoading) return null;

      final isAuthRoute = path.startsWith('/login') ||
          path.startsWith('/register') ||
          path.startsWith('/forgot-password') ||
          path.startsWith('/verify-email');

      if (!isAuth && !isAuthRoute) return '/login';
      if (isAuth && isAuthRoute) return '/customer';
      return null;
    },
    routes: [
      // ── Auth Routes ────────────────────────────────────────
      GoRoute(path: '/login', builder: (ctx, _) => const LoginScreen()),
      GoRoute(path: '/register', builder: (ctx, _) => const RegisterScreen()),
      GoRoute(path: '/forgot-password', builder: (ctx, _) => const ForgotPasswordScreen()),
      GoRoute(path: '/verify-email', builder: (ctx, _) => const EmailVerificationScreen()),

      // ── Customer Portal (shell with bottom nav) ────────────
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (ctx, state, child) => CustomerShell(child: child),
        routes: [
          GoRoute(path: '/customer', builder: (ctx, _) => const DashboardScreen()),
          GoRoute(path: '/customer/bookings', builder: (ctx, _) => const BookingsScreen()),
          GoRoute(
            path: '/customer/bookings/:id',
            builder: (ctx, state) => BookingDetailScreen(bookingId: state.pathParameters['id']!),
          ),
          GoRoute(path: '/customer/notifications', builder: (ctx, _) => const NotificationsScreen()),
          GoRoute(path: '/customer/profile', builder: (ctx, _) => const ProfileScreen()),
        ],
      ),

      // ── Full-screen customer routes (outside shell) ────────
      GoRoute(path: '/customer/payment', builder: (ctx, _) => const PaymentScreen()),
      GoRoute(path: '/customer/booking/success', builder: (ctx, _) => const BookingSuccessScreen()),
      GoRoute(path: '/customer/booking/failed', builder: (ctx, _) => const BookingFailedScreen()),
      GoRoute(
        path: '/customer/booking/tracking/:id',
        builder: (ctx, state) => BookingTrackingScreen(bookingId: state.pathParameters['id']!),
      ),
    ],
  );
}
