import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/chat_message.dart';
import '../models/provider_booking.dart';
import '../models/provider_notification.dart';
import '../models/provider_profile.dart';
import '../models/service_item.dart';

class ProviderApi {
  static SupabaseClient get client => Supabase.instance.client;
  static User? get currentUser => client.auth.currentUser;

  // ── Auth ──────────────────────────────────────────────────────

  static Future<void> signIn(String email, String password) async {
    try {
      final response =
          await client.auth.signInWithPassword(email: email, password: password);
      if (response.user == null) throw Exception('Login failed');
    } catch (error) {
      throw Exception(authErrorMessage(error, signingUp: false));
    }
  }

  static Future<void> signUp({
    required String fullName,
    required String phone,
    required String email,
    required String password,
  }) async {
    try {
      final response = await client.auth.signUp(
        email: email,
        password: password,
        data: {'full_name': fullName, 'phone': phone, 'role': 'provider'},
      );
      if (response.user == null) throw Exception('Signup failed');
    } catch (error) {
      throw Exception(authErrorMessage(error, signingUp: true));
    }
  }

  static Future<void> signOut() => client.auth.signOut();

  static String authErrorMessage(Object error, {required bool signingUp}) {
    final message = error is AuthException
        ? error.message
        : error.toString().replaceFirst('Exception: ', '');
    final normalized = message.toLowerCase();

    if (normalized.contains('invalid login') ||
        normalized.contains('invalid credentials') ||
        normalized.contains('email or password')) {
      return 'Invalid email or password.';
    }
    if (normalized.contains('email') &&
        (normalized.contains('invalid') ||
            normalized.contains('format') ||
            normalized.contains('validate'))) {
      return 'Enter a valid email address.';
    }
    if (normalized.contains('password') && normalized.contains('six')) {
      return 'Use a password with at least 6 characters.';
    }
    if (normalized.contains('already registered') ||
        normalized.contains('already exists') ||
        normalized.contains('user already')) {
      return 'An account already exists with this email.';
    }
    if (normalized.contains('email not confirmed') ||
        normalized.contains('confirm')) {
      return 'Please verify your email before logging in.';
    }
    if (normalized.contains('network') ||
        normalized.contains('socket') ||
        normalized.contains('connection')) {
      return 'Please check your internet connection and try again.';
    }

    return signingUp
        ? 'Could not create your account. Please try again.'
        : 'Could not log in. Please try again.';
  }

  // ── Profile ───────────────────────────────────────────────────

  static Future<ProviderProfile?> getProviderProfile() async {
    final user = currentUser;
    if (user == null) return null;
    final profile = await client
        .from('profiles')
        .select('id, full_name, phone, approval_status')
        .eq('id', user.id)
        .maybeSingle();
    final provider = await client
        .from('providers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
    return ProviderProfile(
      userId: user.id,
      providerId: provider?['id']?.toString(),
      fullName: profile?['full_name'] as String? ?? '',
      phone: profile?['phone'] as String? ?? '',
      approvalStatus: profile?['approval_status'] as String? ?? 'pending',
      businessName: provider?['business_name'] as String? ??
          profile?['full_name'] as String? ??
          '',
      location: provider?['location'] as String? ?? '',
      experience: provider?['experience'] as String? ?? '',
      about: provider?['about'] as String? ?? '',
      imageUrl: provider?['image_url'] as String? ?? '',
      certificates: ((provider?['certificates'] as List?) ?? const [])
          .map((item) => item.toString())
          .toList(),
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
    await client
        .from('profiles')
        .update({'phone': phone}).eq('id', current.userId);
    final payload = {
      'user_id': current.userId,
      'business_name': businessName,
      'location': location,
      'experience': experience,
      'certificates': certificates
          .split(',')
          .map((item) => item.trim())
          .where((item) => item.isNotEmpty)
          .toList(),
      'image_url': imageUrl,
      'about': about,
    };
    if (current.providerId == null) {
      await client.from('providers').insert(payload);
    } else {
      await client
          .from('providers')
          .update(payload)
          .eq('id', current.providerId!);
    }
    return (await getProviderProfile())!;
  }

  // ── Bookings ──────────────────────────────────────────────────

  static Future<List<ProviderBooking>> getProviderBookings(
      String providerId) async {
    final data = await client
        .from('bookings')
        .select(
            '*, customer:profiles!bookings_customer_id_fkey(full_name, phone), service:services!bookings_service_id_fkey(name)')
        .eq('provider_id', providerId)
        .order('created_at', ascending: false);
    return (data as List)
        .map((row) =>
            ProviderBooking.fromJson(Map<String, dynamic>.from(row as Map)))
        .toList();
  }

  static Future<ProviderBooking> getBookingById(String bookingId) async {
    final data = await client
        .from('bookings')
        .select(
            '*, customer:profiles!bookings_customer_id_fkey(full_name, phone), service:services!bookings_service_id_fkey(name)')
        .eq('id', bookingId)
        .single();
    return ProviderBooking.fromJson(Map<String, dynamic>.from(data as Map));
  }

  static Future<void> updateBookingStatus(
      String bookingId, String status) async {
    await client
        .from('bookings')
        .update({'status': status}).eq('id', bookingId);
  }

  /// Cancels a booking via the Supabase edge function which:
  /// 1. Verifies the caller IS the assigned provider (security check)
  /// 2. Calls the Razorpay Refund API using the server-side secret key
  /// 3. Updates the payments table with the refund ID
  /// 4. Sends a notification to the customer
  ///
  /// IMPORTANT: The edge function requires these Supabase secrets to be set:
  ///   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
  ///   (Supabase Dashboard → Edge Functions → Manage secrets)
  static Future<void> cancelBookingWithRefund(String bookingId) async {
    final response = await client.functions.invoke(
      'refund-payment',
      body: {'booking_id': bookingId},
    );
    // response.data is the decoded JSON body
    final data = response.data;
    if (data is Map && data['error'] != null) {
      throw Exception(data['error'].toString());
    }
  }

  // ── Notifications ─────────────────────────────────────────────

  static Future<List<ProviderNotification>> getNotifications(
      String userId) async {
    final data = await client
        .from('notifications')
        .select('*')
        .or('receiver_id.eq.$userId,user_id.eq.$userId')
        .order('created_at', ascending: false);
    return (data as List)
        .map((row) => ProviderNotification.fromJson(
            Map<String, dynamic>.from(row as Map)))
        .toList();
  }

  static Future<void> markNotificationRead(String id) async {
    await client
        .from('notifications')
        .update({'is_read': true, 'read': true}).eq('id', id);
  }

  static Future<void> markAllNotificationsRead(String userId) async {
    await client.from('notifications').update(
        {'is_read': true, 'read': true}).or(
        'receiver_id.eq.$userId,user_id.eq.$userId');
  }

  // ── Chat ──────────────────────────────────────────────────────

  static bool isChatEnabled(String status) => const {
        'accepted',
        'confirmed',
        'in_progress',
        'completed',
      }.contains(status);

  static Future<String?> ensureConversation(String bookingId) async {
    final id = await client.rpc('ensure_booking_conversation',
        params: {'p_booking_id': bookingId});
    if (id != null) return id.toString();
    final row = await client
        .from('conversations')
        .select('id')
        .eq('booking_id', bookingId)
        .maybeSingle();
    return row?['id']?.toString();
  }

  static Future<List<ChatMessage>> getMessages(String conversationId) async {
    final data = await client
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', ascending: true);
    return (data as List)
        .map((row) =>
            ChatMessage.fromJson(Map<String, dynamic>.from(row as Map)))
        .toList();
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

  static Future<void> markConversationRead(
      String conversationId, String userId) async {
    await client
        .from('messages')
        .update({
          'is_read': true,
          'read_at': DateTime.now().toIso8601String(),
        })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('is_read', false);
  }

  // ── Services ──────────────────────────────────────────────────

  static Future<List<ServiceItem>> getServices(String providerId) async {
    final serviceRows = await client
        .from('services')
        .select(
            'id, name, description, category_id, category:categories(id, name)')
        .order('name');
    final enrolledRows = await client
        .from('provider_services')
        .select('service_id, price')
        .eq('provider_id', providerId);
    final prices = {
      for (final row in (enrolledRows as List))
        row['service_id'].toString():
            (row['price'] as num?)?.toDouble() ?? 0.0,
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

  static Future<void> saveProviderServices(
      String providerId, List<ServiceItem> enrolled) async {
    await client
        .from('provider_services')
        .delete()
        .eq('provider_id', providerId);
    if (enrolled.isEmpty) return;
    await client.from('provider_services').insert(enrolled.map((service) {
      return {
        'provider_id': providerId,
        'service_id': service.id,
        'price': service.price
      };
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
