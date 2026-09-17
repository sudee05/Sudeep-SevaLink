import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/app_providers.dart';
import '../../theme/app_theme.dart';
import '../widgets/sevalink_logo.dart';


class CustomerShell extends ConsumerWidget {
  final Widget child;
  const CustomerShell({super.key, required this.child});

  static int _locationToIndex(String location) {
    if (location.startsWith('/customer/bookings')) return 1;
    if (location.startsWith('/customer/notifications')) return 2;
    if (location.startsWith('/customer/profile')) return 3;
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.path;
    final currentIndex = _locationToIndex(location);
    final profile = ref.watch(authProvider).profile;

    return Scaffold(
      appBar: AppBar(
        leading: const Padding(
          padding: EdgeInsets.only(left: 12),
          child: SevalinkLogo(height: 28),
        ),
        leadingWidth: 160,
        actions: [
          // Theme toggle
          Consumer(builder: (ctx, ref, _) {
            final mode = ref.watch(themeProvider);
            return IconButton(
              icon: Icon(mode == ThemeMode.dark
                  ? Icons.light_mode_outlined
                  : Icons.dark_mode_outlined),
              onPressed: () => ref.read(themeProvider.notifier).toggle(),
            );
          }),
          // Avatar
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: GestureDetector(
              onTap: () => context.go('/customer/profile'),
              child: CircleAvatar(
                radius: 18,
                backgroundColor: AppColors.primary,
                backgroundImage: profile?.avatarUrl != null && profile!.avatarUrl!.isNotEmpty
                    ? NetworkImage(profile.avatarUrl!)
                    : null,
                child: (profile?.avatarUrl == null || profile!.avatarUrl!.isEmpty)
                    ? Text(
                        (profile?.fullName.isNotEmpty == true
                                ? profile!.fullName[0]
                                : '?')
                            .toUpperCase(),
                        style: const TextStyle(
                            color: Colors.white, fontWeight: FontWeight.w700),
                      )
                    : null,
              ),
            ),
          ),
        ],
      ),
      body: child,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(color: AppColors.darkBorder, width: 1),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: currentIndex,
          onTap: (index) {
            switch (index) {
              case 0:
                context.go('/customer');
                break;
              case 1:
                context.go('/customer/bookings');
                break;
              case 2:
                context.go('/customer/notifications');
                break;
              case 3:
                context.go('/customer/profile');
                break;
            }
          },
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.calendar_today_outlined),
              activeIcon: Icon(Icons.calendar_today),
              label: 'Bookings',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.notifications_outlined),
              activeIcon: Icon(Icons.notifications),
              label: 'Alerts',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}
