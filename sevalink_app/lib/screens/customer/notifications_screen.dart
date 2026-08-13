import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../models/models.dart';
import '../../providers/app_providers.dart';
import '../../services/supabase_api.dart' as api;
import '../../theme/app_theme.dart';

final _notificationsProvider = FutureProvider.autoDispose.family<List<NotificationModel>, String>(
    (ref, userId) => api.getNotifications(userId));

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(authProvider).profile;
    final notifAsync = ref.watch(_notificationsProvider(profile?.id ?? ''));

    final unreadCount = notifAsync.value?.where((n) => !n.isRead).length ?? 0;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(_notificationsProvider),
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Notifications',
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineSmall
                                  ?.copyWith(fontWeight: FontWeight.w800)),
                          Text('Booking and service updates',
                              style: Theme.of(context).textTheme.bodySmall),
                        ],
                      ),
                      if (unreadCount > 0)
                        TextButton(
                          onPressed: () async {
                            await api.markAllNotificationsRead(profile?.id ?? '');
                            ref.invalidate(_notificationsProvider);
                          },
                          child: const Text('Mark all read', style: TextStyle(fontSize: 12)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  notifAsync.when(
                    data: (notifications) => notifications.isEmpty
                        ? _EmptyNotifications()
                        : Column(
                            children: notifications
                                .map((n) => _NotificationCard(
                                      notification: n,
                                      onMarkRead: n.isRead
                                          ? null
                                          : () async {
                                              await api.markNotificationRead(n.id);
                                              ref.invalidate(_notificationsProvider);
                                            },
                                    ))
                                .toList(),
                          ),
                    loading: () => const Center(child: CircularProgressIndicator()),
                    error: (e, _) => Center(child: Text('Error: $e')),
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyNotifications extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.notifications_none_outlined, size: 36, color: AppColors.primary),
            ),
            const SizedBox(height: 16),
            Text('No notifications yet',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text('Booking and approval updates will appear here.',
                textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}

class _NotificationCard extends StatelessWidget {
  final NotificationModel notification;
  final VoidCallback? onMarkRead;

  const _NotificationCard({required this.notification, this.onMarkRead});

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('dd MMM, hh:mm a');
    return AnimatedOpacity(
      opacity: notification.isRead ? 0.65 : 1.0,
      duration: const Duration(milliseconds: 300),
      child: Card(
        margin: const EdgeInsets.only(bottom: 10),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: notification.isRead
                      ? AppColors.darkMuted.withOpacity(0.1)
                      : AppColors.primary.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Icons.notifications_outlined,
                  color: notification.isRead ? AppColors.darkMuted : AppColors.primary,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(notification.title,
                              style: TextStyle(
                                fontWeight: notification.isRead ? FontWeight.w500 : FontWeight.w700,
                                fontSize: 14,
                              )),
                        ),
                        if (!notification.isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppColors.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(notification.message,
                        style: Theme.of(context).textTheme.bodySmall,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(fmt.format(notification.createdAt),
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(fontSize: 11, color: AppColors.darkMuted)),
                        if (onMarkRead != null)
                          GestureDetector(
                            onTap: onMarkRead,
                            child: Text('Mark read',
                                style: TextStyle(
                                    color: AppColors.primary,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600)),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
