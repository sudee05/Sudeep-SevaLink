import 'package:flutter/material.dart';

import '../models/provider_booking.dart';
import '../models/provider_profile.dart';
import '../services/provider_api.dart';
import '../widgets/booking_list_tile.dart';
import '../widgets/empty_provider_profile.dart';
import '../widgets/status_chip.dart';

class BookingsPage extends StatefulWidget {
  const BookingsPage({super.key, required this.profile});

  final ProviderProfile profile;

  @override
  State<BookingsPage> createState() => _BookingsPageState();
}

class _BookingsPageState extends State<BookingsPage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  late Future<List<ProviderBooking>> _future = _loadBookings();

  final _statusGroups = const [
    {'label': 'All', 'statuses': <String>{}},
    {
      'label': 'Pending',
      'statuses': {'pending', 'reschedule_requested'}
    },
    {'label': 'Active', 'statuses': {'accepted', 'confirmed', 'in_progress'}},
    {'label': 'Done', 'statuses': {'completed', 'cancelled', 'rejected'}},
  ];

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: _statusGroups.length, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

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

  List<ProviderBooking> _filter(
      List<ProviderBooking> all, Set<String> statuses) {
    if (statuses.isEmpty) return all;
    return all.where((b) => statuses.contains(b.status)).toList();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.profile.providerId == null) return const EmptyProviderProfile();

    return Column(
      children: [
        TabBar(
          controller: _tabs,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: _statusGroups
              .map((g) => Tab(text: g['label'] as String))
              .toList(),
        ),
        Expanded(
          child: FutureBuilder<List<ProviderBooking>>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              final all = snapshot.data ?? [];
              return TabBarView(
                controller: _tabs,
                children: _statusGroups.map((group) {
                  final filtered =
                      _filter(all, group['statuses'] as Set<String>);
                  if (filtered.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.inbox_outlined,
                            size: 48,
                            color: Theme.of(context)
                                .colorScheme
                                .primary
                                .withValues(alpha: 0.3),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'No ${(group['label'] as String).toLowerCase()} bookings',
                            style: const TextStyle(color: Color(0xFF9CA3AF)),
                          ),
                        ],
                      ),
                    );
                  }
                  return ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) =>
                        BookingListTile(booking: filtered[index], onChanged: _reload),
                  );
                }).toList(),
              );
            },
          ),
        ),
      ],
    );
  }
}
