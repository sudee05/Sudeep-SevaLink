import 'package:flutter/material.dart';

void main() {
  runApp(const SevaLinkProviderApp());
}

class SevaLinkProviderApp extends StatelessWidget {
  const SevaLinkProviderApp({super.key});

  @override
  Widget build(BuildContext context) {
    const seed = Color(0xFF0F766E);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'SevaLink Provider',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: seed,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF6F8F7),
        appBarTheme: const AppBarTheme(
          centerTitle: false,
          elevation: 0,
          backgroundColor: Color(0xFFF6F8F7),
          foregroundColor: Color(0xFF10201D),
        ),
        cardTheme: CardThemeData(
          elevation: 0,
          margin: EdgeInsets.zero,
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: const BorderSide(color: Color(0xFFE2E8E5)),
          ),
        ),
      ),
      home: const ProviderHomePage(),
    );
  }
}

class ProviderHomePage extends StatefulWidget {
  const ProviderHomePage({super.key});

  @override
  State<ProviderHomePage> createState() => _ProviderHomePageState();
}

class _ProviderHomePageState extends State<ProviderHomePage> {
  int _selectedIndex = 0;
  final List<ProviderBooking> _bookings = ProviderBooking.samples();
  final List<ServiceItem> _catalog = ServiceItem.samples();
  final Set<String> _selectedServices = {'plumbing', 'bathroom'};
  final Map<String, int> _prices = {
    'plumbing': 650,
    'bathroom': 1200,
  };
  final List<ServiceRequest> _requests = [];
  ProviderProfile _profile = ProviderProfile.sample();

  int get _unreadNotifications =>
      _bookings.where((booking) => booking.status == BookingStatus.pending).length;

  void _changeBookingStatus(String id, BookingStatus status) {
    setState(() {
      final index = _bookings.indexWhere((booking) => booking.id == id);
      if (index == -1) return;
      _bookings[index] = _bookings[index].copyWith(status: status);
    });
  }

  void _updateServiceSelection(String id, bool selected) {
    setState(() {
      if (selected) {
        _selectedServices.add(id);
        _prices.putIfAbsent(id, () => 0);
      } else if (id != 'plumbing') {
        _selectedServices.remove(id);
        _prices.remove(id);
      }
    });
  }

  void _updatePrice(String id, int price) {
    setState(() => _prices[id] = price);
  }

  void _addServiceRequest(ServiceRequest request) {
    setState(() => _requests.insert(0, request));
  }

  void _saveProfile(ProviderProfile profile) {
    setState(() => _profile = profile);
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      ProviderDashboardPage(
        profile: _profile,
        bookings: _bookings,
        onStatusChanged: _changeBookingStatus,
        onOpenBookings: () => setState(() => _selectedIndex = 1),
      ),
      ProviderBookingsPage(
        bookings: _bookings,
        onStatusChanged: _changeBookingStatus,
      ),
      ProviderServicesPage(
        catalog: _catalog,
        selectedServices: _selectedServices,
        prices: _prices,
        requests: _requests,
        onSelectionChanged: _updateServiceSelection,
        onPriceChanged: _updatePrice,
        onRequestAdded: _addServiceRequest,
      ),
      ProviderAnalyticsPage(bookings: _bookings),
      ProviderReviewsPage(reviews: ProviderReview.samples()),
      ProviderProfilePage(profile: _profile, onSave: _saveProfile),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('SevaLink Provider'),
            SizedBox(height: 2),
            Text(
              'Manage bookings, services, and business growth',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w400),
            ),
          ],
        ),
        actions: [
          Stack(
            alignment: Alignment.topRight,
            children: [
              IconButton(
                tooltip: 'Notifications',
                icon: const Icon(Icons.notifications_outlined),
                onPressed: () => _showNotifications(context),
              ),
              if (_unreadNotifications > 0)
                Positioned(
                  right: 9,
                  top: 9,
                  child: CircleAvatar(
                    radius: 8,
                    backgroundColor: Theme.of(context).colorScheme.error,
                    child: Text(
                      '$_unreadNotifications',
                      style: const TextStyle(color: Colors.white, fontSize: 10),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(child: pages[_selectedIndex]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) => setState(() => _selectedIndex = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment),
            label: 'Bookings',
          ),
          NavigationDestination(
            icon: Icon(Icons.construction_outlined),
            selectedIcon: Icon(Icons.construction),
            label: 'Services',
          ),
          NavigationDestination(
            icon: Icon(Icons.analytics_outlined),
            selectedIcon: Icon(Icons.analytics),
            label: 'Analytics',
          ),
          NavigationDestination(
            icon: Icon(Icons.reviews_outlined),
            selectedIcon: Icon(Icons.reviews),
            label: 'Reviews',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }

  void _showNotifications(BuildContext context) {
    final pendingBookings = _bookings
        .where((booking) => booking.status == BookingStatus.pending)
        .toList();

    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SectionHeader(
                title: 'Notifications',
                subtitle: 'Booking and provider account updates.',
              ),
              if (pendingBookings.isEmpty)
                const EmptyPanel(
                  icon: Icons.notifications_none,
                  title: 'No new notifications',
                  subtitle: 'Fresh booking requests will appear here.',
                )
              else
                ...pendingBookings.map(
                  (booking) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const CircleAvatar(child: Icon(Icons.calendar_month)),
                    title: Text('New ${booking.service} request'),
                    subtitle: Text('${booking.customer} · ${formatDate(booking.date)}'),
                    trailing: TextButton(
                      onPressed: () {
                        Navigator.pop(context);
                        setState(() => _selectedIndex = 1);
                      },
                      child: const Text('Open'),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class ProviderDashboardPage extends StatelessWidget {
  const ProviderDashboardPage({
    super.key,
    required this.profile,
    required this.bookings,
    required this.onStatusChanged,
    required this.onOpenBookings,
  });

  final ProviderProfile profile;
  final List<ProviderBooking> bookings;
  final StatusChanged onStatusChanged;
  final VoidCallback onOpenBookings;

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final todaysBookings = bookings.where((booking) => isSameDay(booking.date, today)).length;
    final pending = bookings.where((booking) => booking.status == BookingStatus.pending).length;
    final completed = bookings.where((booking) => booking.status == BookingStatus.completed).length;
    final revenue = bookings
        .where((booking) => booking.status == BookingStatus.completed)
        .fold<int>(0, (sum, booking) => sum + booking.amount);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        WelcomePanel(profile: profile, pendingCount: pending, onOpenBookings: onOpenBookings),
        const SizedBox(height: 14),
        GridLayout(
          children: [
            StatCard(label: "Today's Bookings", value: '$todaysBookings', icon: Icons.calendar_today),
            StatCard(label: 'Pending Requests', value: '$pending', icon: Icons.schedule),
            StatCard(label: 'Completed Jobs', value: '$completed', icon: Icons.check_circle_outline),
            StatCard(label: 'Revenue', value: formatCurrency(revenue), icon: Icons.currency_rupee),
            StatCard(label: 'Average Rating', value: profile.rating.toStringAsFixed(1), icon: Icons.star_outline),
          ],
        ),
        const SizedBox(height: 14),
        SectionCard(
          title: 'Booking Performance',
          subtitle: 'Revenue and booking volume this month.',
          child: MiniChart(bookings: bookings),
        ),
        const SizedBox(height: 14),
        SectionCard(
          title: 'Recent Bookings',
          subtitle: 'Accept, reject, reschedule, or complete incoming jobs.',
          child: Column(
            children: bookings.take(3).map((booking) {
              return BookingTile(booking: booking, onStatusChanged: onStatusChanged);
            }).toList(),
          ),
        ),
      ],
    );
  }
}

class ProviderBookingsPage extends StatelessWidget {
  const ProviderBookingsPage({
    super.key,
    required this.bookings,
    required this.onStatusChanged,
  });

  final List<ProviderBooking> bookings;
  final StatusChanged onStatusChanged;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SectionHeader(
          title: 'Bookings',
          subtitle: 'View details, timelines, customer notes, and status actions.',
        ),
        const SizedBox(height: 12),
        ...bookings.map(
          (booking) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: BookingTile(
              booking: booking,
              expanded: true,
              onStatusChanged: onStatusChanged,
            ),
          ),
        ),
      ],
    );
  }
}

class ProviderServicesPage extends StatefulWidget {
  const ProviderServicesPage({
    super.key,
    required this.catalog,
    required this.selectedServices,
    required this.prices,
    required this.requests,
    required this.onSelectionChanged,
    required this.onPriceChanged,
    required this.onRequestAdded,
  });

  final List<ServiceItem> catalog;
  final Set<String> selectedServices;
  final Map<String, int> prices;
  final List<ServiceRequest> requests;
  final ServiceSelectionChanged onSelectionChanged;
  final ServicePriceChanged onPriceChanged;
  final ValueChanged<ServiceRequest> onRequestAdded;

  @override
  State<ProviderServicesPage> createState() => _ProviderServicesPageState();
}

class _ProviderServicesPageState extends State<ProviderServicesPage> {
  int _tab = 0;
  String _category = 'All';
  final _serviceNameController = TextEditingController();
  final _descriptionController = TextEditingController();

  @override
  void dispose() {
    _serviceNameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final categories = ['All', ...{for (final service in widget.catalog) service.category}];
    final visibleCatalog = widget.catalog.where((service) {
      return _category == 'All' || service.category == _category;
    }).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SectionHeader(
          title: 'My Services',
          subtitle: 'Select services you offer or request a new service type.',
        ),
        const SizedBox(height: 12),
        SegmentedButton<int>(
          segments: const [
            ButtonSegment(value: 0, label: Text('Select Services'), icon: Icon(Icons.checklist)),
            ButtonSegment(value: 1, label: Text('Request New'), icon: Icon(Icons.add_circle_outline)),
          ],
          selected: {_tab},
          onSelectionChanged: (selection) => setState(() => _tab = selection.first),
        ),
        const SizedBox(height: 14),
        if (_tab == 0) ...[
          DropdownButtonFormField<String>(
            value: _category,
            decoration: const InputDecoration(
              labelText: 'Category',
              border: OutlineInputBorder(),
            ),
            items: categories
                .map((category) => DropdownMenuItem(value: category, child: Text(category)))
                .toList(),
            onChanged: (value) => setState(() => _category = value ?? 'All'),
          ),
          const SizedBox(height: 12),
          ...visibleCatalog.map(_serviceCard),
        ] else
          _requestForm(context),
      ],
    );
  }

  Widget _serviceCard(ServiceItem service) {
    final selected = widget.selectedServices.contains(service.id);
    final price = widget.prices[service.id] ?? service.suggestedPrice;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: selected,
                onChanged: service.id == 'plumbing'
                    ? null
                    : (value) => widget.onSelectionChanged(service.id, value),
                title: Text(service.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text('${service.category} · ${service.description}'),
              ),
              if (selected) ...[
                const SizedBox(height: 8),
                TextFormField(
                  key: ValueKey('price-${service.id}-$price'),
                  initialValue: '$price',
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    prefixText: 'Rs ',
                    labelText: 'Your service price',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (value) => widget.onPriceChanged(service.id, int.tryParse(value) ?? 0),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _requestForm(BuildContext context) {
    return SectionCard(
      title: 'Request a New Service Type',
      subtitle: 'Admin review normally takes 1-2 business days.',
      child: Column(
        children: [
          TextField(
            controller: _serviceNameController,
            decoration: const InputDecoration(
              labelText: 'Service name',
              hintText: 'e.g. Solar panel installation',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _descriptionController,
            minLines: 3,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'Description',
              hintText: 'Describe the service briefly',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () {
              final name = _serviceNameController.text.trim();
              if (name.isEmpty) return;
              widget.onRequestAdded(
                ServiceRequest(
                  name: name,
                  description: _descriptionController.text.trim(),
                  createdAt: DateTime.now(),
                ),
              );
              _serviceNameController.clear();
              _descriptionController.clear();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Service request submitted')),
              );
            },
            icon: const Icon(Icons.send),
            label: const Text('Submit Request'),
          ),
          if (widget.requests.isNotEmpty) ...[
            const Divider(height: 28),
            ...widget.requests.map(
              (request) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.pending_actions),
                title: Text(request.name),
                subtitle: Text('${request.description.isEmpty ? 'No description' : request.description} · Pending'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class ProviderAnalyticsPage extends StatelessWidget {
  const ProviderAnalyticsPage({super.key, required this.bookings});

  final List<ProviderBooking> bookings;

  @override
  Widget build(BuildContext context) {
    final completed = bookings.where((booking) => booking.status == BookingStatus.completed).length;
    final totalRevenue = bookings
        .where((booking) => booking.status == BookingStatus.completed)
        .fold<int>(0, (sum, booking) => sum + booking.amount);
    final acceptanceRate = bookings.isEmpty
        ? 0
        : (bookings.where((booking) => booking.status != BookingStatus.rejected).length / bookings.length * 100)
            .round();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SectionHeader(
          title: 'Analytics',
          subtitle: 'Revenue and booking performance by month.',
        ),
        const SizedBox(height: 12),
        GridLayout(
          children: [
            StatCard(label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: Icons.currency_rupee),
            StatCard(label: 'Jobs Completed', value: '$completed', icon: Icons.task_alt),
            StatCard(label: 'Acceptance Rate', value: '$acceptanceRate%', icon: Icons.trending_up),
          ],
        ),
        const SizedBox(height: 14),
        SectionCard(
          title: 'Monthly Trend',
          subtitle: 'A compact view of booking value across recent jobs.',
          child: MiniChart(bookings: bookings, tall: true),
        ),
      ],
    );
  }
}

class ProviderReviewsPage extends StatelessWidget {
  const ProviderReviewsPage({super.key, required this.reviews});

  final List<ProviderReview> reviews;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SectionHeader(
          title: 'Reviews',
          subtitle: 'Customer feedback for your completed bookings.',
        ),
        const SizedBox(height: 12),
        ...reviews.map(
          (review) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(review.customer, style: const TextStyle(fontWeight: FontWeight.w700)),
                        ),
                        RatingStars(rating: review.rating),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(review.service, style: TextStyle(color: Colors.grey.shade700)),
                    const SizedBox(height: 8),
                    Text(review.comment),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class ProviderProfilePage extends StatefulWidget {
  const ProviderProfilePage({
    super.key,
    required this.profile,
    required this.onSave,
  });

  final ProviderProfile profile;
  final ValueChanged<ProviderProfile> onSave;

  @override
  State<ProviderProfilePage> createState() => _ProviderProfilePageState();
}

class _ProviderProfilePageState extends State<ProviderProfilePage> {
  late final TextEditingController _businessName;
  late final TextEditingController _phone;
  late final TextEditingController _location;
  late final TextEditingController _experience;
  late final TextEditingController _certificates;
  late final TextEditingController _about;

  @override
  void initState() {
    super.initState();
    _businessName = TextEditingController(text: widget.profile.businessName);
    _phone = TextEditingController(text: widget.profile.phone);
    _location = TextEditingController(text: widget.profile.location);
    _experience = TextEditingController(text: widget.profile.experience);
    _certificates = TextEditingController(text: widget.profile.certificates.join(', '));
    _about = TextEditingController(text: widget.profile.about);
  }

  @override
  void dispose() {
    _businessName.dispose();
    _phone.dispose();
    _location.dispose();
    _experience.dispose();
    _certificates.dispose();
    _about.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SectionHeader(
          title: 'Business Profile',
          subtitle: 'Edit business details, documents, and certifications.',
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 42,
                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                  child: const Icon(Icons.storefront, size: 42),
                ),
                const SizedBox(height: 16),
                _field(_businessName, 'Business name'),
                _field(_phone, 'Phone', keyboardType: TextInputType.phone),
                _field(_location, 'Location'),
                _field(_experience, 'Experience'),
                _field(_certificates, 'Certificates, comma separated'),
                _field(_about, 'About your business', minLines: 3),
                const SizedBox(height: 8),
                FilledButton.icon(
                  onPressed: () {
                    widget.onSave(
                      ProviderProfile(
                        businessName: _businessName.text.trim(),
                        phone: _phone.text.trim(),
                        location: _location.text.trim(),
                        experience: _experience.text.trim(),
                        certificates: _certificates.text
                            .split(',')
                            .map((item) => item.trim())
                            .where((item) => item.isNotEmpty)
                            .toList(),
                        about: _about.text.trim(),
                        rating: widget.profile.rating,
                      ),
                    );
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Profile saved successfully')),
                    );
                  },
                  icon: const Icon(Icons.save_outlined),
                  label: const Text('Save Changes'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _field(
    TextEditingController controller,
    String label, {
    TextInputType? keyboardType,
    int minLines = 1,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        minLines: minLines,
        maxLines: minLines == 1 ? 1 : 5,
        decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
      ),
    );
  }
}

class WelcomePanel extends StatelessWidget {
  const WelcomePanel({
    super.key,
    required this.profile,
    required this.pendingCount,
    required this.onOpenBookings,
  });

  final ProviderProfile profile;
  final int pendingCount;
  final VoidCallback onOpenBookings;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF123D36),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            profile.businessName,
            style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          Text(
            '${profile.location} · ${profile.experience} experience',
            style: TextStyle(color: Colors.white.withValues(alpha: 0.78)),
          ),
          const SizedBox(height: 16),
          FilledButton.tonalIcon(
            onPressed: onOpenBookings,
            icon: const Icon(Icons.inbox_outlined),
            label: Text(pendingCount == 1 ? '1 pending request' : '$pendingCount pending requests'),
          ),
        ],
      ),
    );
  }
}

class BookingTile extends StatelessWidget {
  const BookingTile({
    super.key,
    required this.booking,
    required this.onStatusChanged,
    this.expanded = false,
  });

  final ProviderBooking booking;
  final StatusChanged onStatusChanged;
  final bool expanded;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(booking.customer, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                      const SizedBox(height: 3),
                      Text('${booking.service} · ${formatDate(booking.date)}'),
                    ],
                  ),
                ),
                StatusChip(status: booking.status),
              ],
            ),
            if (expanded) ...[
              const SizedBox(height: 10),
              InfoRow(icon: Icons.location_on_outlined, text: booking.address),
              InfoRow(icon: Icons.phone_outlined, text: booking.phone),
              InfoRow(icon: Icons.notes_outlined, text: booking.notes),
              InfoRow(icon: Icons.currency_rupee, text: formatCurrency(booking.amount)),
            ],
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (booking.status == BookingStatus.pending) ...[
                  FilledButton(
                    onPressed: () => onStatusChanged(booking.id, BookingStatus.accepted),
                    child: const Text('Accept'),
                  ),
                  OutlinedButton(
                    onPressed: () => onStatusChanged(booking.id, BookingStatus.rejected),
                    child: const Text('Reject'),
                  ),
                ],
                if ({BookingStatus.pending, BookingStatus.accepted, BookingStatus.confirmed}.contains(booking.status))
                  OutlinedButton.icon(
                    onPressed: () => onStatusChanged(booking.id, BookingStatus.rescheduleRequested),
                    icon: const Icon(Icons.event_repeat, size: 18),
                    label: const Text('Reschedule'),
                  ),
                if (booking.status == BookingStatus.accepted)
                  FilledButton.tonal(
                    onPressed: () => onStatusChanged(booking.id, BookingStatus.inProgress),
                    child: const Text('Mark In Progress'),
                  ),
                if ({BookingStatus.accepted, BookingStatus.confirmed, BookingStatus.inProgress}.contains(booking.status))
                  FilledButton.icon(
                    onPressed: () => onStatusChanged(booking.id, BookingStatus.completed),
                    icon: const Icon(Icons.check, size: 18),
                    label: const Text('Complete'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class MiniChart extends StatelessWidget {
  const MiniChart({super.key, required this.bookings, this.tall = false});

  final List<ProviderBooking> bookings;
  final bool tall;

  @override
  Widget build(BuildContext context) {
    final maxAmount = bookings.fold<int>(1, (max, booking) => booking.amount > max ? booking.amount : max);

    return SizedBox(
      height: tall ? 220 : 160,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: bookings.map((booking) {
          final heightFactor = booking.amount / maxAmount;
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Expanded(
                    child: Align(
                      alignment: Alignment.bottomCenter,
                      child: FractionallySizedBox(
                        heightFactor: heightFactor.clamp(0.12, 1),
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: booking.status == BookingStatus.completed
                                ? Theme.of(context).colorScheme.primary
                                : Theme.of(context).colorScheme.secondaryContainer,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const SizedBox(width: double.infinity),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    shortDate(booking.date),
                    style: const TextStyle(fontSize: 11),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class SectionCard extends StatelessWidget {
  const SectionCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SectionHeader(title: title, subtitle: subtitle),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({
    super.key,
    required this.title,
    required this.subtitle,
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: 3),
        Text(subtitle, style: TextStyle(color: Colors.grey.shade700)),
      ],
    );
  }
}

class StatCard extends StatelessWidget {
  const StatCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary),
            const Spacer(),
            Text(value, style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w900)),
            const SizedBox(height: 3),
            Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
          ],
        ),
      ),
    );
  }
}

class GridLayout extends StatelessWidget {
  const GridLayout({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final count = constraints.maxWidth > 700 ? 3 : 2;
        return GridView.count(
          crossAxisCount: count,
          childAspectRatio: 1.28,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          children: children,
        );
      },
    );
  }
}

class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.status});

  final BookingStatus status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      BookingStatus.completed => Colors.green,
      BookingStatus.rejected => Colors.red,
      BookingStatus.cancelled => Colors.red,
      BookingStatus.inProgress => Colors.blue,
      BookingStatus.accepted => Colors.teal,
      BookingStatus.confirmed => Colors.indigo,
      BookingStatus.rescheduleRequested => Colors.orange,
      BookingStatus.pending => Colors.amber,
    };
    final foreground = Color.lerp(color, Colors.black, 0.25) ?? color;

    return Chip(
      label: Text(status.label),
      visualDensity: VisualDensity.compact,
      backgroundColor: color.withValues(alpha: 0.12),
      side: BorderSide(color: color.withValues(alpha: 0.25)),
      labelStyle: TextStyle(color: foreground, fontWeight: FontWeight.w700, fontSize: 12),
    );
  }
}

class InfoRow extends StatelessWidget {
  const InfoRow({super.key, required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 17, color: Colors.grey.shade600),
          const SizedBox(width: 8),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}

class RatingStars extends StatelessWidget {
  const RatingStars({super.key, required this.rating});

  final int rating;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(
        5,
        (index) => Icon(
          index < rating ? Icons.star : Icons.star_border,
          size: 17,
          color: Colors.amber.shade700,
        ),
      ),
    );
  }
}

class EmptyPanel extends StatelessWidget {
  const EmptyPanel({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Center(
        child: Column(
          children: [
            Icon(icon, size: 42, color: Colors.grey.shade500),
            const SizedBox(height: 8),
            Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(subtitle, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

typedef StatusChanged = void Function(String bookingId, BookingStatus status);
typedef ServiceSelectionChanged = void Function(String serviceId, bool selected);
typedef ServicePriceChanged = void Function(String serviceId, int price);

enum BookingStatus {
  pending,
  accepted,
  confirmed,
  inProgress,
  rescheduleRequested,
  completed,
  rejected,
  cancelled;

  String get label {
    return switch (this) {
      BookingStatus.inProgress => 'in progress',
      BookingStatus.rescheduleRequested => 'reschedule',
      _ => name,
    };
  }
}

class ProviderBooking {
  const ProviderBooking({
    required this.id,
    required this.customer,
    required this.phone,
    required this.service,
    required this.date,
    required this.address,
    required this.notes,
    required this.amount,
    required this.status,
  });

  final String id;
  final String customer;
  final String phone;
  final String service;
  final DateTime date;
  final String address;
  final String notes;
  final int amount;
  final BookingStatus status;

  ProviderBooking copyWith({BookingStatus? status}) {
    return ProviderBooking(
      id: id,
      customer: customer,
      phone: phone,
      service: service,
      date: date,
      address: address,
      notes: notes,
      amount: amount,
      status: status ?? this.status,
    );
  }

  static List<ProviderBooking> samples() {
    final now = DateTime.now();
    return [
      ProviderBooking(
        id: 'BK-1042',
        customer: 'Aarav Sharma',
        phone: '+91 98765 12011',
        service: 'Bathroom plumbing repair',
        date: now.add(const Duration(hours: 2)),
        address: 'Indiranagar, Bengaluru',
        notes: 'Leak below wash basin. Customer prefers evening visit.',
        amount: 1200,
        status: BookingStatus.pending,
      ),
      ProviderBooking(
        id: 'BK-1041',
        customer: 'Meera Rao',
        phone: '+91 98450 44219',
        service: 'Kitchen sink service',
        date: now.add(const Duration(days: 1, hours: 3)),
        address: 'Koramangala, Bengaluru',
        notes: 'Bring replacement drain pipe.',
        amount: 950,
        status: BookingStatus.accepted,
      ),
      ProviderBooking(
        id: 'BK-1039',
        customer: 'Kabir Menon',
        phone: '+91 99887 43100',
        service: 'Water purifier installation',
        date: now.subtract(const Duration(days: 1)),
        address: 'HSR Layout, Bengaluru',
        notes: 'Installation completed with customer confirmation.',
        amount: 1800,
        status: BookingStatus.completed,
      ),
      ProviderBooking(
        id: 'BK-1037',
        customer: 'Nisha Iyer',
        phone: '+91 90081 10022',
        service: 'Tap replacement',
        date: now.subtract(const Duration(days: 3)),
        address: 'Whitefield, Bengaluru',
        notes: 'Customer asked for reschedule due to building access.',
        amount: 700,
        status: BookingStatus.rescheduleRequested,
      ),
    ];
  }
}

class ServiceItem {
  const ServiceItem({
    required this.id,
    required this.name,
    required this.category,
    required this.description,
    required this.suggestedPrice,
  });

  final String id;
  final String name;
  final String category;
  final String description;
  final int suggestedPrice;

  static List<ServiceItem> samples() {
    return const [
      ServiceItem(
        id: 'plumbing',
        name: 'General Plumbing',
        category: 'Home Repair',
        description: 'Leaks, pipe fixes, and fixture repairs',
        suggestedPrice: 650,
      ),
      ServiceItem(
        id: 'bathroom',
        name: 'Bathroom Deep Repair',
        category: 'Home Repair',
        description: 'Flush, tap, drainage, and fitting work',
        suggestedPrice: 1200,
      ),
      ServiceItem(
        id: 'purifier',
        name: 'Water Purifier Installation',
        category: 'Appliance',
        description: 'RO setup, filter replacement, and inspection',
        suggestedPrice: 1800,
      ),
      ServiceItem(
        id: 'electrical',
        name: 'Electrical Inspection',
        category: 'Electrical',
        description: 'Switches, wiring checks, and safety inspection',
        suggestedPrice: 900,
      ),
      ServiceItem(
        id: 'painting',
        name: 'Wall Painting',
        category: 'Renovation',
        description: 'Touch-ups, single-room painting, and prep work',
        suggestedPrice: 2500,
      ),
    ];
  }
}

class ServiceRequest {
  const ServiceRequest({
    required this.name,
    required this.description,
    required this.createdAt,
  });

  final String name;
  final String description;
  final DateTime createdAt;
}

class ProviderReview {
  const ProviderReview({
    required this.customer,
    required this.service,
    required this.rating,
    required this.comment,
  });

  final String customer;
  final String service;
  final int rating;
  final String comment;

  static List<ProviderReview> samples() {
    return const [
      ProviderReview(
        customer: 'Kabir Menon',
        service: 'Water purifier installation',
        rating: 5,
        comment: 'Fast, professional, and explained the filter maintenance clearly.',
      ),
      ProviderReview(
        customer: 'Ananya Das',
        service: 'General plumbing',
        rating: 4,
        comment: 'Good work and arrived on time. Pricing was clear before starting.',
      ),
      ProviderReview(
        customer: 'Rohan Shetty',
        service: 'Tap replacement',
        rating: 5,
        comment: 'Clean job. No follow-up leakage and polite communication.',
      ),
    ];
  }
}

class ProviderProfile {
  const ProviderProfile({
    required this.businessName,
    required this.phone,
    required this.location,
    required this.experience,
    required this.certificates,
    required this.about,
    required this.rating,
  });

  final String businessName;
  final String phone;
  final String location;
  final String experience;
  final List<String> certificates;
  final String about;
  final double rating;

  static ProviderProfile sample() {
    return const ProviderProfile(
      businessName: 'Sudeep Home Services',
      phone: '+91 98765 43210',
      location: 'Bengaluru',
      experience: '5 years',
      certificates: ['Verified plumber', 'Safety trained'],
      about: 'Reliable home repair provider focused on plumbing, installation, and quick service visits.',
      rating: 4.8,
    );
  }
}

bool isSameDay(DateTime a, DateTime b) {
  return a.year == b.year && a.month == b.month && a.day == b.day;
}

String formatCurrency(int amount) {
  return 'Rs $amount';
}

String formatDate(DateTime date) {
  final hour = date.hour % 12 == 0 ? 12 : date.hour % 12;
  final minute = date.minute.toString().padLeft(2, '0');
  final suffix = date.hour >= 12 ? 'PM' : 'AM';
  return '${date.day}/${date.month}/${date.year} · $hour:$minute $suffix';
}

String shortDate(DateTime date) {
  return '${date.day}/${date.month}';
}
