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
import '../screens/customer/provider_detail_screen.dart';
import '../screens/customer/notifications_screen.dart';
import '../screens/customer/profile_screen.dart';
import '../screens/customer/payment_screen.dart';
import '../screens/customer/booking_success_screen.dart';

// ── Navigator keys — created once at module level ─────────────
final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

/// Bridges Riverpod auth state into a ChangeNotifier so GoRouter can
/// re-evaluate its redirect via [refreshListenable] without being
/// recreated (which would cause "Multiple widgets used the same GlobalKey").
class _AuthNotifier extends ChangeNotifier {
  bool _isAuthenticated;
  bool _isLoading;

  _AuthNotifier({required bool isAuthenticated, required bool isLoading})
      : _isAuthenticated = isAuthenticated,
        _isLoading = isLoading;

  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;

  void update({required bool isAuthenticated, required bool isLoading}) {
    if (_isAuthenticated != isAuthenticated || _isLoading != isLoading) {
      _isAuthenticated = isAuthenticated;
      _isLoading = isLoading;
      notifyListeners();
    }
  }
}

/// The GoRouter is created **exactly once** inside this Provider.
/// Auth changes are pushed into [_AuthNotifier] so GoRouter re-runs
/// its redirect logic without recreating itself.
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.read(authProvider);
  final notifier = _AuthNotifier(
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
  );

  ref.listen(authProvider, (_, next) {
    notifier.update(
      isAuthenticated: next.isAuthenticated,
      isLoading: next.isLoading,
    );
  });

  final router = GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: authState.isAuthenticated ? '/customer' : '/login',
    refreshListenable: notifier,
    redirect: (context, state) {
      if (notifier.isLoading) return null;

      final path = state.uri.path;
      final isAuthRoute = path.startsWith('/login') ||
          path.startsWith('/register') ||
          path.startsWith('/forgot-password') ||
          path.startsWith('/verify-email');

      if (!notifier.isAuthenticated && !isAuthRoute) return '/login';
      if (notifier.isAuthenticated && isAuthRoute) return '/customer';
      return null;
    },
    routes: [
      // ── Auth Routes ──────────────────────────────────────────
      GoRoute(path: '/login', builder: (ctx, _) => const LoginScreen()),
      GoRoute(path: '/register', builder: (ctx, _) => const RegisterScreen()),
      GoRoute(path: '/forgot-password', builder: (ctx, _) => const ForgotPasswordScreen()),
      GoRoute(path: '/verify-email', builder: (ctx, _) => const EmailVerificationScreen()),

      // ── Customer Portal (shell with bottom nav) ──────────────
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
          GoRoute(
            path: '/customer/providers/:id',
            builder: (ctx, state) => ProviderDetailScreen(providerId: state.pathParameters['id']!),
          ),
        ],
      ),

      // ── Full-screen customer routes (outside shell) ──────────
      GoRoute(path: '/customer/payment', builder: (ctx, _) => const PaymentScreen()),
      GoRoute(path: '/customer/booking/success', builder: (ctx, _) => const BookingSuccessScreen()),
      GoRoute(path: '/customer/booking/failed', builder: (ctx, _) => const BookingFailedScreen()),
      GoRoute(
        path: '/customer/booking/tracking/:id',
        builder: (ctx, state) => BookingTrackingScreen(bookingId: state.pathParameters['id']!),
      ),
    ],
  );

  ref.onDispose(() => notifier.dispose());
  return router;
});

/// Convenience shim — main.dart uses this so it stays unchanged.
GoRouter buildRouter(WidgetRef ref) => ref.watch(routerProvider);
