import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/models.dart';
import '../../providers/app_providers.dart';
import '../../services/supabase_api.dart' as api;
import '../../theme/app_theme.dart';
import 'package:intl/intl.dart';

final _categoriesProvider = FutureProvider<List<ServiceCategory>>((ref) => api.getCategories());
final _servicesProvider = FutureProvider<List<ServiceModel>>((ref) => api.getServices());
final _providersByServiceProvider =
    FutureProvider.family<List<ProviderModel>, String>((ref, serviceId) => api.getProvidersByService(serviceId));
final _bookingsProvider = FutureProvider.family<List<BookingModel>, String>(
    (ref, customerId) => api.getCustomerBookings(customerId));

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  ServiceModel? _selectedService;
  String _selectedCategoryId = 'all';
  ProviderModel? _bookingProvider;
  String _locationFilter = '';
  String _maxPrice = '';

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(authProvider).profile;
    final categoriesAsync = ref.watch(_categoriesProvider);
    final servicesAsync = ref.watch(_servicesProvider);
    final bookingsAsync = ref.watch(_bookingsProvider(profile?.id ?? ''));

    final totalBookings = bookingsAsync.value?.length ?? 0;
    final pending = bookingsAsync.value?.where((b) => b.status == 'pending').length ?? 0;
    final completed = bookingsAsync.value?.where((b) => b.status == 'completed').length ?? 0;
    final totalServices = servicesAsync.value?.length ?? 0;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(_categoriesProvider);
          ref.invalidate(_servicesProvider);
          ref.invalidate(_bookingsProvider);
        },
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // Welcome header
                  Text(
                    'Welcome back${profile?.fullName.isNotEmpty == true ? ', ${profile!.fullName.split(' ').first}' : ''} 👋',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  Text('Find and book home services near you',
                      style: Theme.of(context).textTheme.bodyMedium),
                  const SizedBox(height: 20),

                  // Stat cards
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                    childAspectRatio: 2.2,
                    children: [
                      _StatCard('Total Bookings', '$totalBookings', Icons.bookmark_outline),
                      _StatCard('Pending', '$pending', Icons.pending_outlined, color: AppColors.warning),
                      _StatCard('Completed', '$completed', Icons.check_circle_outline, color: AppColors.success),
                      _StatCard('Services', '$totalServices', Icons.home_repair_service_outlined),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Service selection card
                  _buildServiceSection(context, categoriesAsync, servicesAsync),

                  // Providers section
                  if (_selectedService != null) ...[
                    const SizedBox(height: 16),
                    _buildProvidersSection(context),
                  ],

                  const SizedBox(height: 80),
                ]),
              ),
            ),
          ],
        ),
      ),

      // Booking modal
      bottomSheet: _bookingProvider != null
          ? _BookingBottomSheet(
              service: _selectedService!,
              provider: _bookingProvider!,
              customerId: profile?.id ?? '',
              customerName: profile?.fullName ?? '',
              onClose: () => setState(() => _bookingProvider = null),
              onSuccess: () {
                setState(() => _bookingProvider = null);
                ref.invalidate(_bookingsProvider);
                showSnack(context, 'Booking created successfully!');
              },
            )
          : null,
    );
  }

  Widget _buildServiceSection(
      BuildContext context, AsyncValue<List<ServiceCategory>> categoriesAsync, AsyncValue<List<ServiceModel>> servicesAsync) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Choose a Service',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text('Start by selecting what you need.',
                style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 16),
            if (_selectedService != null)
              _SelectedServiceChip(
                service: _selectedService!,
                onRemove: () => setState(() {
                  _selectedService = null;
                  _selectedCategoryId = 'all';
                  _bookingProvider = null;
                }),
              )
            else ...[
              // Category filter chips
              categoriesAsync.when(
                data: (cats) => SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _categoryChip('All', 'all'),
                      ...cats.map((c) => _categoryChip(c.name, c.id)),
                    ],
                  ),
                ),
                loading: () => const LinearProgressIndicator(),
                error: (_, __) => const SizedBox.shrink(),
              ),
              const SizedBox(height: 14),
              // Service grid
              servicesAsync.when(
                data: (services) {
                  final filtered = _selectedCategoryId == 'all'
                      ? services
                      : services.where((s) => s.categoryId == _selectedCategoryId).toList();
                  if (filtered.isEmpty) {
                    return const Center(child: Text('No services in this category.'));
                  }
                  return Column(
                    children: filtered.map((s) => _ServiceTile(
                          service: s,
                          onTap: () => setState(() {
                            _selectedService = s;
                            _bookingProvider = null;
                          }),
                        )).toList(),
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Text('Error: $e'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _categoryChip(String label, String id) {
    final selected = _selectedCategoryId == id;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: () => setState(() {
          _selectedCategoryId = id;
          _selectedService = null;
          _bookingProvider = null;
        }),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: selected ? AppColors.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: selected ? AppColors.primary : AppColors.darkBorder,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : null,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
              fontSize: 13,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildProvidersSection(BuildContext context) {
    final providersAsync = ref.watch(_providersByServiceProvider(_selectedService!.id));

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Providers for ${_selectedService!.name}',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            // Filters
            Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: const InputDecoration(
                      hintText: 'Filter by location',
                      prefixIcon: Icon(Icons.location_on_outlined, size: 18),
                      contentPadding: EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                    ),
                    onChanged: (v) => setState(() => _locationFilter = v),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    decoration: const InputDecoration(
                      hintText: 'Max price',
                      prefixIcon: Icon(Icons.currency_rupee_outlined, size: 18),
                      contentPadding: EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                    ),
                    keyboardType: TextInputType.number,
                    onChanged: (v) => setState(() => _maxPrice = v),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            providersAsync.when(
              data: (providers) {
                final visible = providers.where((p) {
                  final locMatch = _locationFilter.isEmpty ||
                      (p.location ?? '').toLowerCase().contains(_locationFilter.toLowerCase());
                  final maxP = double.tryParse(_maxPrice) ?? 0;
                  final priceMatch = maxP == 0 || (p.price ?? 0) == 0 || (p.price ?? 0) <= maxP;
                  return locMatch && priceMatch;
                }).toList();

                if (visible.isEmpty) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: Text('No providers found for this service.'),
                    ),
                  );
                }
                return Column(
                  children: visible
                      .map((p) => _ProviderCard(
                            provider: p,
                            onBook: () => setState(() => _bookingProvider = p),
                          ))
                      .toList(),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text('Error: $e'),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Sub-widgets ───────────────────────────────────────────────

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color? color;

  const _StatCard(this.label, this.value, this.icon, {this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Icon(icon, color: color ?? AppColors.primary, size: 22),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(value,
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                Text(label,
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(fontSize: 11)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SelectedServiceChip extends StatelessWidget {
  final ServiceModel service;
  final VoidCallback onRemove;

  const _SelectedServiceChip({required this.service, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.primary, width: 1.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(service.name,
                    style: const TextStyle(
                        color: AppColors.primary, fontWeight: FontWeight.w700)),
                if (service.description != null)
                  Text(service.description!,
                      style: Theme.of(context).textTheme.bodySmall,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
          GestureDetector(
            onTap: onRemove,
            child: Container(
              width: 28,
              height: 28,
              decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
              child: const Icon(Icons.close, color: Colors.white, size: 16),
            ),
          ),
        ],
      ),
    );
  }
}

class _ServiceTile extends StatelessWidget {
  final ServiceModel service;
  final VoidCallback onTap;

  const _ServiceTile({required this.service, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.darkBorder),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.home_repair_service_outlined,
                  color: AppColors.primary, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(service.name,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  if (service.categoryName != null)
                    Text(service.categoryName!,
                        style: Theme.of(context).textTheme.bodySmall),
                  if (service.description != null)
                    Text(service.description!,
                        style: Theme.of(context).textTheme.bodySmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.darkMuted),
          ],
        ),
      ),
    );
  }
}

class _ProviderCard extends StatelessWidget {
  final ProviderModel provider;
  final VoidCallback onBook;

  const _ProviderCard({required this.provider, required this.onBook});

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: AppColors.primary.withOpacity(0.15),
                  backgroundImage: provider.imageUrl != null && provider.imageUrl!.isNotEmpty
                      ? NetworkImage(provider.imageUrl!)
                      : null,
                  child: (provider.imageUrl == null || provider.imageUrl!.isEmpty)
                      ? Text(provider.displayName[0].toUpperCase(),
                          style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700))
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(provider.displayName,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                      Row(
                        children: [
                          const Icon(Icons.location_on_outlined, size: 13, color: AppColors.darkMuted),
                          const SizedBox(width: 2),
                          Text(provider.location ?? 'Location not added',
                              style: Theme.of(context).textTheme.bodySmall),
                          const SizedBox(width: 8),
                          const Icon(Icons.star, size: 13, color: AppColors.warning),
                          const SizedBox(width: 2),
                          Text(provider.rating.toStringAsFixed(1),
                              style: Theme.of(context).textTheme.bodySmall),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (provider.about != null && provider.about!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(provider.about!,
                  style: Theme.of(context).textTheme.bodySmall,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis),
            ],
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  provider.price != null && provider.price! > 0
                      ? fmt.format(provider.price!)
                      : 'Price TBD',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                ),
                ElevatedButton(
                  onPressed: onBook,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  ),
                  child: const Text('Book'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Booking Bottom Sheet ──────────────────────────────────────

class _BookingBottomSheet extends ConsumerStatefulWidget {
  final ServiceModel service;
  final ProviderModel provider;
  final String customerId;
  final String customerName;
  final VoidCallback onClose;
  final VoidCallback onSuccess;

  const _BookingBottomSheet({
    required this.service,
    required this.provider,
    required this.customerId,
    required this.customerName,
    required this.onClose,
    required this.onSuccess,
  });

  @override
  ConsumerState<_BookingBottomSheet> createState() => _BookingBottomSheetState();
}

class _BookingBottomSheetState extends ConsumerState<_BookingBottomSheet> {
  final _addressCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  DateTime? _date;
  TimeOfDay? _time;
  bool _loading = false;

  @override
  void dispose() {
    _addressCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_date == null || _time == null || _addressCtrl.text.isEmpty) {
      showSnack(context, 'Please fill all required fields', isError: true);
      return;
    }
    setState(() => _loading = true);
    try {
      final dateStr = DateFormat('yyyy-MM-dd').format(_date!);
      final timeStr = '${_time!.hour.toString().padLeft(2, '0')}:${_time!.minute.toString().padLeft(2, '0')}';
      await api.createBooking(
        customerId: widget.customerId,
        providerId: widget.provider.id,
        serviceId: widget.service.id,
        serviceTitle: widget.service.name,
        providerName: widget.provider.displayName,
        customerName: widget.customerName,
        bookingDate: dateStr,
        bookingTime: timeStr,
        address: _addressCtrl.text.trim(),
        notes: _notesCtrl.text.trim(),
        amount: widget.provider.price ?? 0,
      );
      widget.onSuccess();
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('dd MMM yyyy');
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: AppColors.darkBorder)),
      ),
      padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.darkBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(widget.service.name,
                          style: const TextStyle(
                              color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.w600)),
                      Text('Book ${widget.provider.displayName}',
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w800)),
                    ],
                  ),
                ),
                IconButton(onPressed: widget.onClose, icon: const Icon(Icons.close)),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.calendar_today_outlined, size: 16),
                    label: Text(_date == null ? 'Select Date' : dateFmt.format(_date!)),
                    onPressed: () async {
                      final d = await showDatePicker(
                        context: context,
                        initialDate: DateTime.now().add(const Duration(days: 1)),
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 90)),
                      );
                      if (d != null) setState(() => _date = d);
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.access_time_outlined, size: 16),
                    label: Text(_time == null ? 'Select Time' : _time!.format(context)),
                    onPressed: () async {
                      final t = await showTimePicker(
                        context: context,
                        initialTime: TimeOfDay.now(),
                      );
                      if (t != null) setState(() => _time = t);
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _addressCtrl,
              decoration: const InputDecoration(
                hintText: 'Service address *',
                prefixIcon: Icon(Icons.location_on_outlined),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _notesCtrl,
              maxLines: 2,
              decoration: const InputDecoration(
                hintText: 'Special instructions (optional)',
                prefixIcon: Icon(Icons.notes_outlined),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: _loading ? null : _submit,
                    child: _loading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Confirm Booking'),
                  ),
                ),
                const SizedBox(width: 8),
                OutlinedButton(onPressed: widget.onClose, child: const Text('Cancel')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
