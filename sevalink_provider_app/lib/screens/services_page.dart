import 'package:flutter/material.dart';

import '../models/provider_profile.dart';
import '../models/service_item.dart';
import '../services/provider_api.dart';
import '../widgets/empty_provider_profile.dart';
import '../widgets/section_card.dart';

class ServicesPage extends StatefulWidget {
  const ServicesPage({super.key, required this.profile});

  final ProviderProfile profile;

  @override
  State<ServicesPage> createState() => _ServicesPageState();
}

class _ServicesPageState extends State<ServicesPage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  late Future<List<ServiceItem>> _future = _load();

  final _reqNameCtrl = TextEditingController();
  final _reqDescCtrl = TextEditingController();

  List<ServiceItem> _services = [];
  Map<String, String> _categories = {};
  String? _categoryId;
  bool _savingServices = false;
  bool _requestingService = false;
  bool _reqDone = false;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    _reqNameCtrl.dispose();
    _reqDescCtrl.dispose();
    super.dispose();
  }

  Future<List<ServiceItem>> _load() async {
    if (widget.profile.providerId == null) return [];
    final services =
        await ProviderApi.getServices(widget.profile.providerId!);
    _services = services;
    _categories = {
      for (final s in services.where((s) => s.categoryId != null))
        s.categoryId!: s.categoryName,
    };
    return services;
  }

  Future<void> _save() async {
    setState(() => _savingServices = true);
    try {
      await ProviderApi.saveProviderServices(
        widget.profile.providerId!,
        _services.where((s) => s.enrolled).toList(),
      );
      setState(() {
        _future = _load();
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✓ Services saved successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _savingServices = false);
    }
  }

  Future<void> _requestService() async {
    if (_reqNameCtrl.text.trim().isEmpty) return;
    setState(() => _requestingService = true);
    try {
      await ProviderApi.requestService(
        providerId: widget.profile.providerId!,
        userId: widget.profile.userId,
        phone: widget.profile.phone,
        categoryId: _categoryId,
        serviceName: _reqNameCtrl.text.trim(),
        description: _reqDescCtrl.text.trim(),
      );
      setState(() => _reqDone = true);
      _reqNameCtrl.clear();
      _reqDescCtrl.clear();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _requestingService = false);
    }
  }

  void _toggleService(ServiceItem service, {bool? enrolled, double? price}) {
    setState(() {
      _services = _services.map((s) {
        if (s.id != service.id) return s;
        return s.copyWith(
          enrolled: enrolled ?? s.enrolled,
          price: price ?? s.price,
        );
      }).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.profile.providerId == null) return const EmptyProviderProfile();

    return Column(
      children: [
        // Tab switcher matching website style
        Container(
          margin: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFF3F4F6),
            borderRadius: BorderRadius.circular(12),
          ),
          child: TabBar(
            controller: _tabs,
            indicator: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            indicatorSize: TabBarIndicatorSize.tab,
            labelColor: const Color(0xFF111827),
            unselectedLabelColor: const Color(0xFF6B7280),
            labelStyle: const TextStyle(fontWeight: FontWeight.w600),
            dividerColor: Colors.transparent,
            tabs: const [
              Tab(text: 'Select Services'),
              Tab(text: 'Request New'),
            ],
          ),
        ),
        Expanded(
          child: FutureBuilder<List<ServiceItem>>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              return TabBarView(
                controller: _tabs,
                children: [
                  _buildSelectTab(),
                  _buildRequestTab(),
                ],
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildSelectTab() {
    final enrolled = _services.where((s) => s.enrolled).toList();
    final addable = _services
        .where((s) =>
            !s.enrolled &&
            (_categoryId == null || s.categoryId == _categoryId))
        .toList();

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      children: [
        // Selected services
        SectionCard(
          title: 'My Selected Services',
          child: enrolled.isEmpty
              ? const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    'Add services from the catalog below, then save.',
                    style: TextStyle(color: Color(0xFF9CA3AF)),
                  ),
                )
              : Column(
                  children: enrolled.map((service) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        border: Border.all(
                            color: const Color(0xFFE5E7EB)),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  service.name,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                ),
                                Text(
                                  service.categoryName,
                                  style: const TextStyle(
                                    color: Color(0xFF9CA3AF),
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          SizedBox(
                            width: 120,
                            child: TextFormField(
                              initialValue:
                                  service.price.toStringAsFixed(0),
                              decoration: const InputDecoration(
                                prefixText: '₹ ',
                                labelText: 'Price',
                                isDense: true,
                              ),
                              keyboardType: TextInputType.number,
                              onChanged: (value) => _toggleService(
                                service,
                                price: double.tryParse(value) ?? 0,
                              ),
                            ),
                          ),
                          const SizedBox(width: 4),
                          IconButton(
                            tooltip: 'Remove',
                            icon: const Icon(Icons.close_rounded,
                                color: Colors.red, size: 18),
                            onPressed: () =>
                                _toggleService(service, enrolled: false),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: _savingServices ? null : _save,
          icon: _savingServices
              ? const SizedBox(
                  height: 16,
                  width: 16,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white))
              : const Icon(Icons.save_rounded),
          label: Text(
              _savingServices ? 'Saving…' : 'Save My Services'),
        ),
        const SizedBox(height: 20),
        // Add more section
        SectionCard(
          title: 'Add More Services',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              DropdownButtonFormField<String?>(
                value: _categoryId,
                decoration: const InputDecoration(
                  labelText: 'Filter by Category',
                  isDense: true,
                ),
                items: [
                  const DropdownMenuItem<String?>(
                      value: null, child: Text('All categories')),
                  ..._categories.entries.map(
                    (e) => DropdownMenuItem<String?>(
                        value: e.key, child: Text(e.value)),
                  ),
                ],
                onChanged: (value) =>
                    setState(() => _categoryId = value),
              ),
              const SizedBox(height: 12),
              if (addable.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    'All services in this category are already selected.',
                    style: TextStyle(color: Color(0xFF9CA3AF)),
                  ),
                )
              else
                ...addable.map(
                  (service) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(service.name,
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(
                      service.description.isEmpty
                          ? service.categoryName
                          : service.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    trailing: FilledButton.tonal(
                      onPressed: () =>
                          _toggleService(service, enrolled: true),
                      child: const Text('Add'),
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildRequestTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        SectionCard(
          title: 'Request a New Service',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "Don't see your service in the catalog? Request it and our admin team will review it within 1–2 business days.",
                style: TextStyle(color: Color(0xFF6B7280), fontSize: 13),
              ),
              const SizedBox(height: 16),
              if (_reqDone)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.green.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: Colors.green.withValues(alpha: 0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.check_circle_rounded,
                              color: Colors.green, size: 18),
                          SizedBox(width: 8),
                          Text(
                            'Request submitted!',
                            style: TextStyle(
                              color: Colors.green,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Our team will review it within 1–2 business days.',
                        style: TextStyle(
                            color: Color(0xFF6B7280), fontSize: 13),
                      ),
                      const SizedBox(height: 10),
                      TextButton(
                        onPressed: () => setState(() => _reqDone = false),
                        child: const Text('Submit another'),
                      ),
                    ],
                  ),
                )
              else ...[
                DropdownButtonFormField<String?>(
                  value: _categoryId,
                  decoration: const InputDecoration(labelText: 'Category'),
                  items: [
                    const DropdownMenuItem<String?>(
                        value: null, child: Text('No category')),
                    ..._categories.entries.map(
                      (e) => DropdownMenuItem<String?>(
                          value: e.key, child: Text(e.value)),
                    ),
                  ],
                  onChanged: (value) =>
                      setState(() => _categoryId = value),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _reqNameCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Service Name *',
                    hintText: 'e.g. Solar Panel Installation',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _reqDescCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                    hintText: 'Briefly describe the service…',
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 16),
                Align(
                  alignment: Alignment.centerLeft,
                  child: FilledButton(
                    onPressed: _requestingService ? null : _requestService,
                    child: Text(
                      _requestingService
                          ? 'Submitting…'
                          : 'Submit Request',
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
