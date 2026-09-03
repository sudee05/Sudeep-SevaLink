import 'package:flutter/material.dart';

import '../models/provider_notification.dart';
import '../models/provider_profile.dart';
import '../services/provider_api.dart';
import 'booking_details_page.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key, required this.profile});

  final ProviderProfile profile;

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  late Future<List<ProviderNotification>> _future =
      ProviderApi.getNotifications(widget.profile.userId);
  bool _markingAllRead = false;
  String? _openingId;

  void _reload() {
    setState(() {
      _future = ProviderApi.getNotifications(widget.profile.userId);
    });
  }

  Future<void> _markAllRead() async {
    setState(() => _markingAllRead = true);
    try {
      await ProviderApi.markAllNotificationsRead(widget.profile.userId);
      _reload();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _markingAllRead = false);
    }
  }

  Future<void> _open(ProviderNotification n) async {
    setState(() => _openingId = n.id);
    try {
      if (!n.isRead) await ProviderApi.markNotificationRead(n.id);
      _reload();
      if (n.bookingId != null && mounted) {
        await Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => BookingDetailsPage(bookingId: n.bookingId!),
          ),
        );
        _reload();
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _openingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<ProviderNotification>>(
      future: _future,
      builder: (context, snapshot) {
        final notifications = snapshot.data ?? [];
        final unread = notifications.where((n) => !n.isRead).length;

        return CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    if (unread > 0) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Theme.of(context)
                              .colorScheme
                              .primary
                              .withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '$unread unread',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ),
                      ),
                    ] else
                      const Text(
                        'All caught up!',
                        style: TextStyle(
                          color: Color(0xFF9CA3AF),
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    const Spacer(),
                    if (unread > 0)
                      TextButton.icon(
                        onPressed: _markingAllRead ? null : _markAllRead,
                        icon: _markingAllRead
                            ? const SizedBox(
                                height: 14,
                                width: 14,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.done_all_rounded, size: 16),
                        label: const Text('Mark all read'),
                      ),
                  ],
                ),
              ),
            ),
            if (snapshot.connectionState == ConnectionState.waiting)
              const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              )
            else if (notifications.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.notifications_none_rounded,
                        size: 56,
                        color: Theme.of(context)
                            .colorScheme
                            .primary
                            .withValues(alpha: 0.3),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'No notifications yet.',
                        style: TextStyle(color: Color(0xFF9CA3AF)),
                      ),
                    ],
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverList.separated(
                  itemCount: notifications.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final n = notifications[index];
                    final opening = _openingId == n.id;
                    return _NotificationCard(
                      notification: n,
                      opening: opening,
                      onTap: () => _open(n),
                      onMarkRead: () async {
                        await ProviderApi.markNotificationRead(n.id);
                        _reload();
                      },
                    );
                  },
                ),
              ),
            const SliverToBoxAdapter(child: SizedBox(height: 16)),
          ],
        );
      },
    );
  }
}

class _NotificationCard extends StatelessWidget {
  const _NotificationCard({
    required this.notification,
    required this.opening,
    required this.onTap,
    required this.onMarkRead,
  });

  final ProviderNotification notification;
  final bool opening;
  final VoidCallback onTap;
  final VoidCallback onMarkRead;

  @override
  Widget build(BuildContext context) {
    final isRead = notification.isRead;
    final hasLink = notification.bookingId != null;
    final cs = Theme.of(context).colorScheme;

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: hasLink ? onTap : null,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icon
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isRead
                      ? const Color(0xFFF3F4F6)
                      : cs.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: opening
                    ? SizedBox(
                        height: 16,
                        width: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: cs.primary,
                        ),
                      )
                    : Icon(
                        isRead
                            ? Icons.notifications_none_rounded
                            : Icons.notifications_active_rounded,
                        size: 18,
                        color: isRead
                            ? const Color(0xFF9CA3AF)
                            : cs.primary,
                      ),
              ),
              const SizedBox(width: 12),
              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            notification.title,
                            style: TextStyle(
                              fontWeight:
                                  isRead ? FontWeight.w500 : FontWeight.w700,
                              fontSize: 14,
                            ),
                          ),
                        ),
                        if (!isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: cs.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      notification.message,
                      style: const TextStyle(
                        color: Color(0xFF6B7280),
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Text(
                          _formatDate(notification.createdAt),
                          style: const TextStyle(
                            color: Color(0xFF9CA3AF),
                            fontSize: 11,
                          ),
                        ),
                        if (hasLink) ...[
                          const Spacer(),
                          Text(
                            'Open booking →',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: cs.primary,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              // Mark read button
              if (!isRead) ...[
                const SizedBox(width: 8),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  tooltip: 'Mark as read',
                  icon: const Icon(Icons.check_rounded, size: 18),
                  onPressed: onMarkRead,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }
}
