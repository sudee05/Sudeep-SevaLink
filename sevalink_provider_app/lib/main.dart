import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const String supabaseUrl = 'https://giygtxqatkrgjeuojgma.supabase.co';
const String supabaseAnonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpeWd0eHFhdGtyZ2pldW9qZ21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Njk0MTcsImV4cCI6MjA5OTQ0NTQxN30.7g7oQjtBQTMpywe7iIPJcxP6Yh2BOUjA8ybzHCXDmWY';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
  runApp(const SevaLinkProviderApp());
}

final _dateFormat = DateFormat('dd MMM yyyy, h:mm a');
final _moneyFormat = NumberFormat.currency(locale: 'en_IN', symbol: 'Rs. ');

class SevaLinkProviderApp extends StatelessWidget {
  const SevaLinkProviderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SevaLink Provider',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF5B5FEF),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF7F8FC),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: const BorderSide(color: Color(0xFFE5E7EB)),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFFD8DDE8)),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        ),
      ),
      home: const AuthGate(),
    );
  }
}

class ProviderProfile {
  const ProviderProfile({
    required this.userId,
    this.providerId,
    this.fullName = '',
    this.phone = '',
    this.businessName = '',
    this.location = '',
    this.experience = '',
    this.about = '',
    this.imageUrl = '',
    this.certificates = const [],
    this.rating = 0,
    this.approvalStatus = 'pending',
  });

  final String userId;
  final String? providerId;
  final String fullName;
  final String phone;
  final String businessName;
  final String location;
  final String experience;
  final String about;
  final String imageUrl;
  final List<String> certificates;
  final double rating;
  final String approvalStatus;
}

class ProviderBooking {
  const ProviderBooking({
    required this.id,
    this.bookingCode,
    this.customerId,
    this.customerName = '-',
    this.customerPhone = '-',
    this.serviceTitle = '-',
    this.status = 'pending',
    this.amount = 0,
    this.address = '',
    this.notes = '',
    this.scheduledDate,
    this.createdAt,
  });

  final String id;
  final String? bookingCode;
  final String? customerId;
  final String customerName;
  final String customerPhone;
  final String serviceTitle;
  final String status;
  final double amount;
  final String address;
  final String notes;
  final DateTime? scheduledDate;
  final DateTime? createdAt;

  factory ProviderBooking.fromJson(Map<String, dynamic> json) {
    final customer = json['customer'] as Map<String, dynamic>?;
    final service = json['service'] as Map<String, dynamic>?;
    final dateValue = json['scheduled_date'] ?? json['booking_date'] ?? json['created_at'];
    return ProviderBooking(
      id: json['id'].toString(),
      bookingCode: json['booking_code'] as String?,
      customerId: json['customer_id']?.toString(),
      customerName: (customer?['full_name'] ?? json['customer_name'] ?? '-') as String,
      customerPhone: (customer?['phone'] ?? json['customer_phone'] ?? '-') as String,
      serviceTitle: (service?['name'] ?? json['service_title'] ?? '-') as String,
      status: json['status'] as String? ?? 'pending',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      address: json['address'] as String? ?? '',
      notes: json['notes'] as String? ?? '',
      scheduledDate: dateValue == null ? null : DateTime.tryParse(dateValue.toString()),
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? ''),
    );
  }
}

class ServiceItem {
  const ServiceItem({
    required this.id,
    required this.name,
    this.description = '',
    this.categoryId,
    this.categoryName = '',
    this.price = 0,
    this.enrolled = false,
  });

  final String id;
  final String name;
  final String description;
  final String? categoryId;
  final String categoryName;
  final double price;
  final bool enrolled;
}

class ProviderNotification {
  const ProviderNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.createdAt,
    this.bookingId,
    this.isRead = false,
  });

  final String id;
  final String title;
  final String message;
  final DateTime createdAt;
  final String? bookingId;
  final bool isRead;

  factory ProviderNotification.fromJson(Map<String, dynamic> json) => ProviderNotification(
        id: json['id'].toString(),
        title: json['title'] as String? ?? '',
        message: json['message'] as String? ?? '',
        bookingId: json['booking_id']?.toString(),
        isRead: (json['is_read'] ?? json['read']) as bool? ?? false,
        createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ?? DateTime.now(),
      );
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.senderId,
    required this.message,
    required this.createdAt,
    this.isRead = false,
  });

  final String id;
  final String senderId;
  final String message;
  final DateTime createdAt;
  final bool isRead;

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        id: json['id'].toString(),
        senderId: json['sender_id'].toString(),
        message: json['message'] as String? ?? '',
        isRead: json['is_read'] as bool? ?? false,
        createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ?? DateTime.now(),
      );
}

class ProviderApi {
  static SupabaseClient get client => Supabase.instance.client;

  static User? get currentUser => client.auth.currentUser;

  static Future<void> signIn(String email, String password) async {
    final response = await client.auth.signInWithPassword(email: email, password: password);
    if (response.user == null) throw Exception('Login failed');
  }

  static Future<void> signUp({
    required String fullName,
    required String phone,
    required String email,
    required String password,
  }) async {
    final response = await client.auth.signUp(
      email: email,
      password: password,
      data: {'full_name': fullName, 'phone': phone, 'role': 'provider'},
    );
    if (response.user == null) throw Exception('Signup failed');
  }

  static Future<void> signOut() => client.auth.signOut();

  static Future<ProviderProfile?> getProviderProfile() async {
    final user = currentUser;
    if (user == null) return null;
    final profile = await client
        .from('profiles')
        .select('id, full_name, phone, approval_status')
        .eq('id', user.id)
        .maybeSingle();
    final provider = await client.from('providers').select('*').eq('user_id', user.id).maybeSingle();
    return ProviderProfile(
      userId: user.id,
      providerId: provider?['id']?.toString(),
      fullName: profile?['full_name'] as String? ?? '',
      phone: profile?['phone'] as String? ?? '',
      approvalStatus: profile?['approval_status'] as String? ?? 'pending',
      businessName: provider?['business_name'] as String? ?? profile?['full_name'] as String? ?? '',
      location: provider?['location'] as String? ?? '',
      experience: provider?['experience'] as String? ?? '',
      about: provider?['about'] as String? ?? '',
      imageUrl: provider?['image_url'] as String? ?? '',
      certificates: ((provider?['certificates'] as List?) ?? const []).map((item) => item.toString()).toList(),
      rating: (provider?['rating'] as num?)?.toDouble() ?? 0,
    );
  }

  static Future<ProviderProfile> saveProviderProfile({
    required ProviderProfile current,
    required String businessName,
    required String phone,
    required String location,
    required String experience,
    required String certificates,
    required String imageUrl,
    required String about,
  }) async {
    await client.from('profiles').update({'phone': phone}).eq('id', current.userId);
    final payload = {
      'user_id': current.userId,
      'business_name': businessName,
      'location': location,
      'experience': experience,
      'certificates': certificates.split(',').map((item) => item.trim()).where((item) => item.isNotEmpty).toList(),
      'image_url': imageUrl,
      'about': about,
    };
    if (current.providerId == null) {
      await client.from('providers').insert(payload);
    } else {
      await client.from('providers').update(payload).eq('id', current.providerId!);
    }
    return (await getProviderProfile())!;
  }

  static Future<List<ProviderBooking>> getProviderBookings(String providerId) async {
    final data = await client
        .from('bookings')
        .select('*, customer:profiles!bookings_customer_id_fkey(full_name, phone), service:services!bookings_service_id_fkey(name)')
        .eq('provider_id', providerId)
        .order('created_at', ascending: false);
    return (data as List).map((row) => ProviderBooking.fromJson(Map<String, dynamic>.from(row as Map))).toList();
  }

  static Future<ProviderBooking> getBookingById(String bookingId) async {
    final data = await client
        .from('bookings')
        .select('*, customer:profiles!bookings_customer_id_fkey(full_name, phone), service:services!bookings_service_id_fkey(name)')
        .eq('id', bookingId)
        .single();
    return ProviderBooking.fromJson(Map<String, dynamic>.from(data as Map));
  }

  static Future<void> updateBookingStatus(String bookingId, String status) async {
    await client.from('bookings').update({'status': status}).eq('id', bookingId);
  }

  static Future<List<ProviderNotification>> getNotifications(String userId) async {
    final data = await client
        .from('notifications')
        .select('*')
        .or('receiver_id.eq.$userId,user_id.eq.$userId')
        .order('created_at', ascending: false);
    return (data as List)
        .map((row) => ProviderNotification.fromJson(Map<String, dynamic>.from(row as Map)))
        .toList();
  }

  static Future<void> markNotificationRead(String id) async {
    await client.from('notifications').update({'is_read': true, 'read': true}).eq('id', id);
  }

  static Future<void> markAllNotificationsRead(String userId) async {
    await client.from('notifications').update({'is_read': true, 'read': true}).or('receiver_id.eq.$userId,user_id.eq.$userId');
  }

  static bool isChatEnabled(String status) => const {
        'accepted',
        'confirmed',
        'in_progress',
        'completed',
      }.contains(status);

  static Future<String?> ensureConversation(String bookingId) async {
    final id = await client.rpc('ensure_booking_conversation', params: {'p_booking_id': bookingId});
    if (id != null) return id.toString();
    final row = await client.from('conversations').select('id').eq('booking_id', bookingId).maybeSingle();
    return row?['id']?.toString();
  }

  static Future<List<ChatMessage>> getMessages(String conversationId) async {
    final data = await client
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', ascending: true);
    return (data as List).map((row) => ChatMessage.fromJson(Map<String, dynamic>.from(row as Map))).toList();
  }

  static Future<void> sendMessage({
    required String conversationId,
    required String senderId,
    required String message,
  }) async {
    await client.from('messages').insert({
      'conversation_id': conversationId,
      'sender_id': senderId,
      'message': message,
    });
  }

  static Future<void> markConversationRead(String conversationId, String userId) async {
    await client
        .from('messages')
        .update({'is_read': true, 'read_at': DateTime.now().toIso8601String()})
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('is_read', false);
  }

  static Future<List<ServiceItem>> getServices(String providerId) async {
    final serviceRows = await client
        .from('services')
        .select('id, name, description, category_id, category:categories(id, name)')
        .order('name');
    final enrolledRows = await client.from('provider_services').select('service_id, price').eq('provider_id', providerId);
    final prices = {
      for (final row in (enrolledRows as List)) row['service_id'].toString(): (row['price'] as num?)?.toDouble() ?? 0,
    };
    return (serviceRows as List).map((row) {
      final map = Map<String, dynamic>.from(row as Map);
      final category = map['category'] as Map<String, dynamic>?;
      final id = map['id'].toString();
      return ServiceItem(
        id: id,
        name: map['name'] as String? ?? '',
        description: map['description'] as String? ?? '',
        categoryId: map['category_id']?.toString(),
        categoryName: category?['name'] as String? ?? '',
        price: prices[id] ?? 0,
        enrolled: prices.containsKey(id),
      );
    }).toList();
  }

  static Future<void> saveProviderServices(String providerId, List<ServiceItem> enrolled) async {
    await client.from('provider_services').delete().eq('provider_id', providerId);
    if (enrolled.isEmpty) return;
    await client.from('provider_services').insert(enrolled.map((service) {
      return {'provider_id': providerId, 'service_id': service.id, 'price': service.price};
    }).toList());
  }

  static Future<void> requestService({
    required String providerId,
    required String userId,
    required String phone,
    String? categoryId,
    required String serviceName,
    required String description,
  }) async {
    await client.from('service_requests').insert({
      'provider_id': providerId,
      'user_id': userId,
      'phone': phone,
      'category_id': categoryId,
      'service_name': serviceName,
      'description': description,
      'status': 'pending',
    });
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  late final StreamSubscription<AuthState> _subscription;
  bool _signedIn = ProviderApi.currentUser != null;

  @override
  void initState() {
    super.initState();
    _subscription = ProviderApi.client.auth.onAuthStateChange.listen((state) {
      if (mounted) setState(() => _signedIn = state.session?.user != null);
    });
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return _signedIn ? const ProviderShell() : const AuthScreen();
  }
}

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _signup = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (_signup) {
        await ProviderApi.signUp(
          fullName: _name.text.trim(),
          phone: _phone.text.trim(),
          email: _email.text.trim(),
          password: _password.text,
        );
      } else {
        await ProviderApi.signIn(_email.text.trim(), _password.text);
      }
    } catch (error) {
      setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Image.asset('assets/sevalink_logo.png', height: 72),
                        const SizedBox(height: 16),
                        Text(
                          _signup ? 'Create provider account' : 'SevaLink Provider',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _signup ? 'Sign up to manage services and bookings.' : 'Login to accept bookings and chat with customers.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 20),
                        if (_signup) ...[
                          TextFormField(controller: _name, decoration: const InputDecoration(labelText: 'Full name'), validator: _required),
                          const SizedBox(height: 12),
                          TextFormField(controller: _phone, decoration: const InputDecoration(labelText: 'Phone'), validator: _required),
                          const SizedBox(height: 12),
                        ],
                        TextFormField(
                          controller: _email,
                          decoration: const InputDecoration(labelText: 'Email'),
                          keyboardType: TextInputType.emailAddress,
                          validator: _required,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _password,
                          decoration: const InputDecoration(labelText: 'Password'),
                          obscureText: true,
                          validator: (value) => (value ?? '').length < 6 ? 'Use at least 6 characters' : null,
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: 12),
                          Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                        ],
                        const SizedBox(height: 18),
                        FilledButton(
                          onPressed: _busy ? null : _submit,
                          child: Text(_busy ? 'Please wait...' : _signup ? 'Sign up' : 'Login'),
                        ),
                        TextButton(
                          onPressed: _busy ? null : () => setState(() => _signup = !_signup),
                          child: Text(_signup ? 'Already have an account? Login' : 'New provider? Create account'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

String? _required(String? value) => (value == null || value.trim().isEmpty) ? 'Required' : null;

class ProviderShell extends StatefulWidget {
  const ProviderShell({super.key});

  @override
  State<ProviderShell> createState() => _ProviderShellState();
}

class _ProviderShellState extends State<ProviderShell> {
  int _index = 0;
  ProviderProfile? _profile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() => _loading = true);
    final profile = await ProviderApi.getProviderProfile();
    if (mounted) {
      setState(() {
        _profile = profile;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = _profile;
    final pages = profile == null
        ? const <Widget>[Center(child: Text('Login required'))]
        : <Widget>[
            DashboardPage(profile: profile),
            BookingsPage(profile: profile),
            ServicesPage(profile: profile),
            NotificationsPage(profile: profile),
            ProfilePage(profile: profile, onSaved: _loadProfile),
          ];

    return Scaffold(
      appBar: AppBar(
        title: Text(_titleForIndex(_index)),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _loadProfile,
            icon: const Icon(Icons.refresh),
          ),
          IconButton(
            tooltip: 'Logout',
            onPressed: ProviderApi.signOut,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadProfile,
              child: pages[_index],
            ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.event_note_outlined), selectedIcon: Icon(Icons.event_note), label: 'Bookings'),
          NavigationDestination(icon: Icon(Icons.handyman_outlined), selectedIcon: Icon(Icons.handyman), label: 'Services'),
          NavigationDestination(icon: Icon(Icons.notifications_outlined), selectedIcon: Icon(Icons.notifications), label: 'Alerts'),
          NavigationDestination(icon: Icon(Icons.storefront_outlined), selectedIcon: Icon(Icons.storefront), label: 'Profile'),
        ],
      ),
    );
  }

  String _titleForIndex(int index) {
    return switch (index) {
      0 => 'Business Overview',
      1 => 'Bookings',
      2 => 'My Services',
      3 => 'Notifications',
      _ => 'Business Profile',
    };
  }
}

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

  void _reload() => setState(() => _future = _loadBookings());

  @override
  Widget build(BuildContext context) {
    final profile = widget.profile;
    if (profile.providerId == null) return const EmptyProviderProfile();
    return FutureBuilder<List<ProviderBooking>>(
      future: _future,
      builder: (context, snapshot) {
        final bookings = snapshot.data ?? [];
        final today = DateTime.now();
        final todays = bookings.where((booking) {
          final date = booking.scheduledDate;
          return date != null && date.year == today.year && date.month == today.month && date.day == today.day;
        }).length;
        final pending = bookings.where((booking) => {'pending', 'reschedule_requested'}.contains(booking.status)).length;
        final completed = bookings.where((booking) => booking.status == 'completed').length;
        final revenue = bookings.where((booking) => booking.status == 'completed').fold<double>(0, (sum, item) => sum + item.amount);

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(profile.businessName.isEmpty ? 'Provider workspace' : profile.businessName, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            GridView.count(
              physics: const NeverScrollableScrollPhysics(),
              shrinkWrap: true,
              crossAxisCount: MediaQuery.sizeOf(context).width > 600 ? 4 : 2,
              childAspectRatio: 1.25,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              children: [
                StatTile(label: "Today's Bookings", value: snapshot.connectionState == ConnectionState.waiting ? '...' : '$todays', icon: Icons.today),
                StatTile(label: 'Pending Requests', value: '${snapshot.hasData ? pending : '...'}', icon: Icons.schedule),
                StatTile(label: 'Completed Jobs', value: '${snapshot.hasData ? completed : '...'}', icon: Icons.check_circle_outline),
                StatTile(label: 'Revenue', value: snapshot.hasData ? _moneyFormat.format(revenue) : '...', icon: Icons.currency_rupee),
              ],
            ),
            const SizedBox(height: 16),
            SectionCard(
              title: 'Recent Bookings',
              child: bookings.isEmpty
                  ? const Text('New customer requests will appear here.')
                  : Column(
                      children: bookings
                          .take(5)
                          .map((booking) => BookingListTile(booking: booking, onChanged: _reload))
                          .toList(),
                    ),
            ),
          ],
        );
      },
    );
  }
}

class StatTile extends StatelessWidget {
  const StatTile({super.key, required this.label, required this.value, required this.icon});

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary),
            const Spacer(),
            Text(value, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
            Text(label, maxLines: 2, overflow: TextOverflow.ellipsis),
          ],
        ),
      ),
    );
  }
}

class BookingsPage extends StatefulWidget {
  const BookingsPage({super.key, required this.profile});

  final ProviderProfile profile;

  @override
  State<BookingsPage> createState() => _BookingsPageState();
}

class _BookingsPageState extends State<BookingsPage> {
  late Future<List<ProviderBooking>> _future = _loadBookings();

  Future<List<ProviderBooking>> _loadBookings() {
    final providerId = widget.profile.providerId;
    if (providerId == null) return Future.value([]);
    return ProviderApi.getProviderBookings(providerId);
  }

  void _reload() => setState(() => _future = _loadBookings());

  @override
  Widget build(BuildContext context) {
    if (widget.profile.providerId == null) return const EmptyProviderProfile();
    return FutureBuilder<List<ProviderBooking>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        final bookings = snapshot.data ?? [];
        if (bookings.isEmpty) return const Center(child: Text('No bookings yet.'));
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: bookings.length,
          separatorBuilder: (_, __) => const SizedBox(height: 10),
          itemBuilder: (context, index) => BookingListTile(booking: bookings[index], onChanged: _reload),
        );
      },
    );
  }
}

class BookingListTile extends StatelessWidget {
  const BookingListTile({super.key, required this.booking, this.onChanged});

  final ProviderBooking booking;
  final VoidCallback? onChanged;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(booking.serviceTitle),
        subtitle: Text('${booking.customerName}\n${_formatDate(booking.scheduledDate)}'),
        isThreeLine: true,
        trailing: StatusChip(status: booking.status),
        onTap: () async {
          await Navigator.of(context).push(MaterialPageRoute(builder: (_) => BookingDetailsPage(bookingId: booking.id)));
          onChanged?.call();
        },
      ),
    );
  }
}

class BookingDetailsPage extends StatefulWidget {
  const BookingDetailsPage({super.key, required this.bookingId});

  final String bookingId;

  @override
  State<BookingDetailsPage> createState() => _BookingDetailsPageState();
}

class _BookingDetailsPageState extends State<BookingDetailsPage> {
  late Future<ProviderBooking> _future = ProviderApi.getBookingById(widget.bookingId);
  bool _changed = false;
  String? _updatingStatus;

  void _reload() => setState(() => _future = ProviderApi.getBookingById(widget.bookingId));

  Future<void> _setStatus(String status) async {
    setState(() => _updatingStatus = status);
    try {
      await ProviderApi.updateBookingStatus(widget.bookingId, status);
      _changed = true;
      _reload();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Booking marked ${status.replaceAll('_', ' ')}')));
      }
    } catch (error) {
      if (mounted) _showError(context, error);
    } finally {
      if (mounted) setState(() => _updatingStatus = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Booking Details'),
        leading: BackButton(onPressed: () => Navigator.of(context).pop(_changed)),
      ),
      body: FutureBuilder<ProviderBooking>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (!snapshot.hasData) return const Center(child: Text('Booking not found'));
          final booking = snapshot.data!;
          final userId = ProviderApi.currentUser?.id;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              SectionCard(
                title: booking.bookingCode ?? booking.id,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    DetailRow(label: 'Customer', value: booking.customerName),
                    DetailRow(label: 'Phone', value: booking.customerPhone),
                    DetailRow(label: 'Service', value: booking.serviceTitle),
                    DetailRow(label: 'Scheduled', value: _formatDate(booking.scheduledDate)),
                    DetailRow(label: 'Amount', value: _moneyFormat.format(booking.amount)),
                    DetailRow(label: 'Address', value: booking.address.isEmpty ? '-' : booking.address),
                    DetailRow(label: 'Notes', value: booking.notes.isEmpty ? '-' : booking.notes),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        StatusChip(status: booking.status),
                        ...statusActions(booking.status).map(
                          (action) => FilledButton.tonal(
                            onPressed: _updatingStatus == null ? () => _setStatus(action.status) : null,
                            child: _updatingStatus == action.status
                                ? const SizedBox(
                                    height: 18,
                                    width: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : Text(action.label),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              if (userId != null) BookingChatCard(booking: booking, userId: userId),
            ],
          );
        },
      ),
    );
  }
}

class BookingChatCard extends StatefulWidget {
  const BookingChatCard({super.key, required this.booking, required this.userId});

  final ProviderBooking booking;
  final String userId;

  @override
  State<BookingChatCard> createState() => _BookingChatCardState();
}

class _BookingChatCardState extends State<BookingChatCard> {
  final _controller = TextEditingController();
  String? _conversationId;
  List<ChatMessage> _messages = [];
  bool _loading = true;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant BookingChatCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.booking.id != widget.booking.id || oldWidget.booking.status != widget.booking.status) {
      _load();
    }
  }

  Future<void> _load() async {
    if (!ProviderApi.isChatEnabled(widget.booking.status)) {
      setState(() {
        _conversationId = null;
        _messages = [];
        _loading = false;
      });
      return;
    }
    setState(() => _loading = true);
    try {
      final conversationId = await ProviderApi.ensureConversation(widget.booking.id);
      final messages = conversationId == null ? <ChatMessage>[] : await ProviderApi.getMessages(conversationId);
      if (conversationId != null) await ProviderApi.markConversationRead(conversationId, widget.userId);
      if (mounted) {
        setState(() {
          _conversationId = conversationId;
          _messages = messages;
          _loading = false;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() => _loading = false);
        _showError(context, error);
      }
    }
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    final conversationId = _conversationId;
    if (text.isEmpty || conversationId == null) return;
    setState(() => _sending = true);
    try {
      await ProviderApi.sendMessage(conversationId: conversationId, senderId: widget.userId, message: text);
      _controller.clear();
      await _load();
    } catch (error) {
      if (mounted) _showError(context, error);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!ProviderApi.isChatEnabled(widget.booking.status)) {
      return const SectionCard(title: 'Messages', child: Text('Chat will be available after you accept the booking.'));
    }
    return SectionCard(
      title: 'Messages',
      child: Column(
        children: [
          if (_loading)
            const Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator())
          else if (_messages.isEmpty)
            const Padding(padding: EdgeInsets.all(20), child: Text('No messages yet.'))
          else
            ..._messages.map((message) {
              final mine = message.senderId == widget.userId;
              return Align(
                alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  padding: const EdgeInsets.all(10),
                  constraints: const BoxConstraints(maxWidth: 280),
                  decoration: BoxDecoration(
                    color: mine ? Theme.of(context).colorScheme.primary : const Color(0xFFF1F4F9),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(message.message, style: TextStyle(color: mine ? Colors.white : Colors.black87)),
                ),
              );
            }),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  decoration: const InputDecoration(hintText: 'Type a message'),
                  minLines: 1,
                  maxLines: 3,
                ),
              ),
              IconButton.filled(
                tooltip: 'Send',
                onPressed: _sending ? null : _send,
                icon: const Icon(Icons.send),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class ServicesPage extends StatefulWidget {
  const ServicesPage({super.key, required this.profile});

  final ProviderProfile profile;

  @override
  State<ServicesPage> createState() => _ServicesPageState();
}

class _ServicesPageState extends State<ServicesPage> {
  late Future<List<ServiceItem>> _future = _load();
  final _requestName = TextEditingController();
  final _requestDescription = TextEditingController();
  List<ServiceItem> _services = [];
  String? _categoryId;
  bool _savingServices = false;
  bool _requestingService = false;

  Future<List<ServiceItem>> _load() async {
    if (widget.profile.providerId == null) return [];
    final services = await ProviderApi.getServices(widget.profile.providerId!);
    _services = services;
    return services;
  }

  @override
  void dispose() {
    _requestName.dispose();
    _requestDescription.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _savingServices = true);
    try {
      await ProviderApi.saveProviderServices(widget.profile.providerId!, _services.where((service) => service.enrolled).toList());
      setState(() => _future = _load());
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Services saved')));
    } catch (error) {
      if (mounted) _showError(context, error);
    } finally {
      if (mounted) setState(() => _savingServices = false);
    }
  }

  Future<void> _requestService() async {
    if (_requestName.text.trim().isEmpty) return;
    setState(() => _requestingService = true);
    try {
      await ProviderApi.requestService(
        providerId: widget.profile.providerId!,
        userId: widget.profile.userId,
        phone: widget.profile.phone,
        categoryId: _categoryId,
        serviceName: _requestName.text.trim(),
        description: _requestDescription.text.trim(),
      );
      _requestName.clear();
      _requestDescription.clear();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Service request submitted')));
    } catch (error) {
      if (mounted) _showError(context, error);
    } finally {
      if (mounted) setState(() => _requestingService = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.profile.providerId == null) return const EmptyProviderProfile();
    return FutureBuilder<List<ServiceItem>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
        final categories = {
          for (final service in _services.where((service) => service.categoryId != null)) service.categoryId!: service.categoryName,
        };
        final enrolled = _services.where((service) => service.enrolled).toList();
        final addable = _services.where((service) => !service.enrolled && (_categoryId == null || service.categoryId == _categoryId)).toList();
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            SectionCard(
              title: 'Selected Services',
              child: enrolled.isEmpty
                  ? const Text('Add services you offer, then save.')
                  : Column(
                      children: enrolled.map((service) {
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(service.name),
                          subtitle: Text(service.categoryName),
                          trailing: SizedBox(
                            width: 132,
                            child: TextFormField(
                              initialValue: service.price.toStringAsFixed(0),
                              decoration: const InputDecoration(prefixText: 'Rs. ', labelText: 'Price'),
                              keyboardType: TextInputType.number,
                              onChanged: (value) => _replaceService(service, price: double.tryParse(value) ?? 0),
                            ),
                          ),
                          leading: IconButton(
                            tooltip: 'Remove service',
                            icon: const Icon(Icons.remove_circle_outline),
                            onPressed: () => _replaceService(service, enrolled: false),
                          ),
                        );
                      }).toList(),
                    ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _savingServices ? null : _save,
              icon: _savingServices
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.save),
              label: Text(_savingServices ? 'Saving...' : 'Save My Services'),
            ),
            const SizedBox(height: 16),
            SectionCard(
              title: 'Add More Services',
              child: Column(
                children: [
                  DropdownButtonFormField<String?>(
                    value: _categoryId,
                    decoration: const InputDecoration(labelText: 'Category'),
                    items: [
                      const DropdownMenuItem<String?>(value: null, child: Text('All categories')),
                      ...categories.entries.map((entry) => DropdownMenuItem<String?>(value: entry.key, child: Text(entry.value))),
                    ],
                    onChanged: (value) => setState(() => _categoryId = value),
                  ),
                  const SizedBox(height: 8),
                  ...addable.map(
                    (service) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(service.name),
                      subtitle: Text(service.description.isEmpty ? service.categoryName : service.description),
                      trailing: IconButton(
                        tooltip: 'Add service',
                        icon: const Icon(Icons.add_circle_outline),
                        onPressed: () => _replaceService(service, enrolled: true),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            SectionCard(
              title: 'Request New Service',
              child: Column(
                children: [
                  TextField(controller: _requestName, decoration: const InputDecoration(labelText: 'Service name')),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _requestDescription,
                    decoration: const InputDecoration(labelText: 'Description'),
                    maxLines: 3,
                  ),
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton.tonal(
                      onPressed: _requestingService ? null : _requestService,
                      child: Text(_requestingService ? 'Submitting...' : 'Submit Request'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  void _replaceService(ServiceItem service, {bool? enrolled, double? price}) {
    setState(() {
      _services = _services.map((item) {
        if (item.id != service.id) return item;
        return ServiceItem(
          id: item.id,
          name: item.name,
          description: item.description,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          price: price ?? item.price,
          enrolled: enrolled ?? item.enrolled,
        );
      }).toList();
    });
  }
}

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key, required this.profile});

  final ProviderProfile profile;

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  late Future<List<ProviderNotification>> _future = ProviderApi.getNotifications(widget.profile.userId);
  bool _markingAllRead = false;
  String? _openingNotificationId;

  void _reload() => setState(() => _future = ProviderApi.getNotifications(widget.profile.userId));

  Future<void> _markAllRead() async {
    setState(() => _markingAllRead = true);
    try {
      await ProviderApi.markAllNotificationsRead(widget.profile.userId);
      _reload();
    } catch (error) {
      if (mounted) _showError(context, error);
    } finally {
      if (mounted) setState(() => _markingAllRead = false);
    }
  }

  Future<void> _openNotification(ProviderNotification notification) async {
    setState(() => _openingNotificationId = notification.id);
    try {
      await ProviderApi.markNotificationRead(notification.id);
      _reload();
      if (notification.bookingId != null && mounted) {
        await Navigator.of(context).push(MaterialPageRoute(builder: (_) => BookingDetailsPage(bookingId: notification.bookingId!)));
        _reload();
      }
    } catch (error) {
      if (mounted) _showError(context, error);
    } finally {
      if (mounted) setState(() => _openingNotificationId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<ProviderNotification>>(
      future: _future,
      builder: (context, snapshot) {
        final notifications = snapshot.data ?? [];
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                Text('${notifications.where((item) => !item.isRead).length} unread'),
                const Spacer(),
                TextButton(
                  onPressed: _markingAllRead ? null : _markAllRead,
                  child: Text(_markingAllRead ? 'Marking...' : 'Mark all read'),
                ),
              ],
            ),
            if (snapshot.connectionState == ConnectionState.waiting)
              const Center(child: CircularProgressIndicator())
            else if (notifications.isEmpty)
              const Center(child: Padding(padding: EdgeInsets.all(24), child: Text('No notifications yet.')))
            else
              ...notifications.map((notification) {
                final opening = _openingNotificationId == notification.id;
                return Card(
                  child: ListTile(
                    leading: opening
                        ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2))
                        : Icon(notification.isRead ? Icons.notifications_none : Icons.notifications_active),
                    title: Text(notification.title),
                    subtitle: Text('${notification.message}\n${_formatDate(notification.createdAt)}'),
                    isThreeLine: true,
                    enabled: _openingNotificationId == null,
                    onTap: () => _openNotification(notification),
                  ),
                );
              }),
          ],
        );
      },
    );
  }
}

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key, required this.profile, required this.onSaved});

  final ProviderProfile profile;
  final VoidCallback onSaved;

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  late final _businessName = TextEditingController(text: widget.profile.businessName);
  late final _phone = TextEditingController(text: widget.profile.phone);
  late final _location = TextEditingController(text: widget.profile.location);
  late final _experience = TextEditingController(text: widget.profile.experience);
  late final _certificates = TextEditingController(text: widget.profile.certificates.join(', '));
  late final _imageUrl = TextEditingController(text: widget.profile.imageUrl);
  late final _about = TextEditingController(text: widget.profile.about);
  bool _saving = false;

  @override
  void dispose() {
    _businessName.dispose();
    _phone.dispose();
    _location.dispose();
    _experience.dispose();
    _certificates.dispose();
    _imageUrl.dispose();
    _about.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ProviderApi.saveProviderProfile(
        current: widget.profile,
        businessName: _businessName.text.trim(),
        phone: _phone.text.trim(),
        location: _location.text.trim(),
        experience: _experience.text.trim(),
        certificates: _certificates.text.trim(),
        imageUrl: _imageUrl.text.trim(),
        about: _about.text.trim(),
      );
      widget.onSaved();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile saved')));
      }
    } catch (error) {
      if (mounted) _showError(context, error);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        SectionCard(
          title: 'Approval',
          child: Row(
            children: [
              StatusChip(status: widget.profile.approvalStatus),
              const SizedBox(width: 8),
              Expanded(child: Text('Provider approval is managed by the admin module.')),
            ],
          ),
        ),
        const SizedBox(height: 12),
        TextField(controller: _businessName, decoration: const InputDecoration(labelText: 'Business name')),
        const SizedBox(height: 10),
        TextField(controller: _phone, decoration: const InputDecoration(labelText: 'Phone')),
        const SizedBox(height: 10),
        TextField(controller: _location, decoration: const InputDecoration(labelText: 'Location')),
        const SizedBox(height: 10),
        TextField(controller: _experience, decoration: const InputDecoration(labelText: 'Experience')),
        const SizedBox(height: 10),
        TextField(controller: _certificates, decoration: const InputDecoration(labelText: 'Certificates, comma separated')),
        const SizedBox(height: 10),
        TextField(controller: _imageUrl, decoration: const InputDecoration(labelText: 'Image URL')),
        const SizedBox(height: 10),
        TextField(controller: _about, decoration: const InputDecoration(labelText: 'About'), maxLines: 4),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: _saving ? null : _save,
          icon: const Icon(Icons.save),
          label: Text(_saving ? 'Saving...' : 'Save Changes'),
        ),
      ],
    );
  }
}

class SectionCard extends StatelessWidget {
  const SectionCard({super.key, required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 10),
            child,
          ],
        ),
      ),
    );
  }
}

class DetailRow extends StatelessWidget {
  const DetailRow({super.key, required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 88, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700))),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}

class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'accepted' || 'confirmed' || 'approved' => Colors.green,
      'completed' => Colors.blue,
      'rejected' || 'cancelled' || 'denied' => Colors.red,
      'in_progress' => Colors.indigo,
      _ => Colors.orange,
    };
    return Chip(
      label: Text(status.replaceAll('_', ' ')),
      visualDensity: VisualDensity.compact,
      side: BorderSide(color: color.withValues(alpha: 0.35)),
      backgroundColor: color.withValues(alpha: 0.1),
    );
  }
}

class EmptyProviderProfile extends StatelessWidget {
  const EmptyProviderProfile({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Text('Complete your business profile before managing bookings and services.'),
      ),
    );
  }
}

class BookingAction {
  const BookingAction(this.label, this.status);

  final String label;
  final String status;
}

List<BookingAction> statusActions(String status) {
  return switch (status) {
    'pending' => const [
        BookingAction('Accept', 'accepted'),
        BookingAction('Reject', 'rejected'),
        BookingAction('Reschedule', 'reschedule_requested'),
      ],
    'accepted' => const [
        BookingAction('In Progress', 'in_progress'),
        BookingAction('Complete', 'completed'),
        BookingAction('Reschedule', 'reschedule_requested'),
      ],
    'confirmed' || 'in_progress' => const [
        BookingAction('Complete', 'completed'),
        BookingAction('Reschedule', 'reschedule_requested'),
      ],
    _ => const [],
  };
}

String _formatDate(DateTime? date) => date == null ? '-' : _dateFormat.format(date.toLocal());

void _showError(BuildContext context, Object error) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(error.toString().replaceFirst('Exception: ', '')),
      backgroundColor: Theme.of(context).colorScheme.error,
    ),
  );
}
