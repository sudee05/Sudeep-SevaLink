import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/provider_booking.dart';
import '../models/provider_profile.dart';
import '../services/provider_api.dart';
import '../widgets/booking_list_tile.dart';
import '../widgets/empty_provider_profile.dart';
import '../widgets/section_card.dart';
import '../widgets/stat_tile.dart';

final _moneyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key, required this.profile});

  final ProviderProfile profile;

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  late Future<List<ProviderBooking>> _future = _loadBookings();

  Future<List<ProviderBooking>> _loadBookings() {
    final providerId = widget.profile.providerId;
    if (providerId == null) return Future.value([]);
    return ProviderApi.getProviderBookings(providerId);
  }

  void _reload() {
    setState(() {
      _future = _loadBookings();
    });
  }

  @override
  Widget build(BuildContext context) {
    final profile = widget.profile;
    if (profile.providerId == null) return const EmptyProviderProfile();

    return FutureBuilder<List<ProviderBooking>>(
      future: _future,
      builder: (context, snapshot) {
        final bookings = snapshot.data ?? [];
        final today = DateTime.now();
        final todays = bookings.where((b) {
          final d = b.scheduledDate;
          return d != null &&
              d.year == today.year &&
              d.month == today.month &&
              d.day == today.day;
        }).length;
        final pending = bookings
            .where((b) =>
                {'pending', 'reschedule_requested'}.contains(b.status))
            .length;
        final completed =
            bookings.where((b) => b.status == 'completed').length;
        final revenue = bookings
            .where((b) => b.status == 'completed')
            .fold<double>(0, (sum, b) => sum + b.amount);
        final loading = snapshot.connectionState == ConnectionState.waiting;

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Header
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        profile.businessName.isEmpty
                            ? 'Provider Workspace'
                            : profile.businessName,
                        style: Theme.of(context)
                            .textTheme
                            .titleLarge
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Manage jobs, revenue, and client experience.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: const Color(0xFF6B7280),
                            ),
                      ),
                    ],
                  ),
                ),
                if (profile.rating > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.amber.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color: Colors.amber.withValues(alpha: 0.4)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.star_rounded,
                            color: Colors.amber, size: 16),
                        const SizedBox(width: 4),
                        Text(
                          profile.rating.toStringAsFixed(1),
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                            color: Colors.amber,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),

            // Stat grid
            GridView.count(
              physics: const NeverScrollableScrollPhysics(),
              shrinkWrap: true,
              crossAxisCount:
                  MediaQuery.sizeOf(context).width > 600 ? 4 : 2,
              childAspectRatio: 1.3,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              children: [
                StatTile(
                  label: "Today's Bookings",
                  value: loading ? '…' : '$todays',
                  icon: Icons.today_rounded,
                  color: const Color(0xFF5B5FEF),
                ),
                StatTile(
                  label: 'Pending Requests',
                  value: loading ? '…' : '$pending',
                  icon: Icons.schedule_rounded,
                  color: Colors.orange,
                ),
                StatTile(
                  label: 'Completed Jobs',
                  value: loading ? '…' : '$completed',
                  icon: Icons.check_circle_outline_rounded,
                  color: Colors.green,
                ),
                StatTile(
                  label: 'Revenue',
                  value: loading ? '…' : _moneyFormat.format(revenue),
                  icon: Icons.currency_rupee_rounded,
                  color: Colors.blue,
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Recent bookings
            SectionCard(
              title: 'Recent Bookings',
              child: snapshot.connectionState == ConnectionState.waiting
                  ? const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: CircularProgressIndicator()))
                  : bookings.isEmpty
                      ? const Padding(
                          padding: EdgeInsets.symmetric(vertical: 12),
                          child: Text(
                            'New customer requests will appear here.',
                            style: TextStyle(color: Color(0xFF9CA3AF)),
                          ),
                        )
                      : Column(
                          children: bookings
                              .take(5)
                              .map((b) => BookingListTile(
                                  booking: b, onChanged: _reload))
                              .toList(),
                        ),
            ),
          ],
        );
      },
    );
  }
}
