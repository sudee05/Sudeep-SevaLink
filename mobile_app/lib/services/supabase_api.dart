import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/models.dart';

final supabase = Supabase.instance.client;

// ── Auth ──────────────────────────────────────────────────────

Future<Map<String, dynamic>> signInWithEmail({
  required String email,
  required String password,
}) async {
  final res = await supabase.auth.signInWithPassword(email: email, password: password);
  if (res.user == null) throw Exception('Sign in failed');
  final profile = await getProfile(res.user!.id);
  return {'user': res.user, 'profile': profile};
}

Future<Map<String, dynamic>> signUpWithEmail({
  required String email,
  required String password,
  required String fullName,
  required String phone,
  String role = 'customer',
}) async {
  final res = await supabase.auth.signUp(
    email: email,
    password: password,
    data: {'full_name': fullName, 'phone': phone, 'role': role},
  );
  if (res.user == null) throw Exception('Registration failed');
  return {'user': res.user};
}

Future<void> signOut() async {
  await supabase.auth.signOut();
}

Future<void> resetPassword(String email) async {
  await supabase.auth.resetPasswordForEmail(email);
}

// ── Profile ───────────────────────────────────────────────────

Future<AppUser> getProfile(String userId) async {
  final data = await supabase.from('profiles').select('*').eq('id', userId).single();
  return AppUser.fromJson(data);
}

Future<AppUser> updateProfile(String userId, Map<String, dynamic> updates) async {
  final data =
      await supabase.from('profiles').update(updates).eq('id', userId).select().single();
  return AppUser.fromJson(data);
}

/// Save FCM token to profiles table (calls the SQL function we added)
Future<void> upsertFcmToken(String userId, String token) async {
  await supabase.rpc('upsert_fcm_token', params: {'p_user_id': userId, 'p_token': token});
}

// ── Categories ────────────────────────────────────────────────

Future<List<ServiceCategory>> getCategories() async {
  final data = await supabase.from('categories').select('*').order('name');
  return (data as List).map((e) => ServiceCategory.fromJson(e)).toList();
}

// ── Services ──────────────────────────────────────────────────

Future<List<ServiceModel>> getServices() async {
  final data = await supabase
      .from('services')
      .select('id, name, description, category_id, category:categories(id, name)')
      .order('name');
  return (data as List).map((e) => ServiceModel.fromJson(e)).toList();
}

// ── Providers by Service ──────────────────────────────────────

Future<List<ProviderModel>> getProvidersByService(String serviceId) async {
  final psData = await supabase
      .from('provider_services')
      .select('provider_id, price')
      .eq('service_id', serviceId);
  final rows = (psData as List).cast<Map<String, dynamic>>();
  if (rows.isEmpty) return [];

  final providerIds = rows.map((row) => row['provider_id'].toString()).toList();
  final priceMap = {
    for (final row in rows) row['provider_id'].toString(): (row['price'] as num?)?.toDouble() ?? 0.0,
  };

  final pData = await supabase
      .from('providers')
      .select('*')
      .inFilter('id', providerIds)
      .or('verified.eq.true,status.eq.approved')
      .order('rating', ascending: false);

  final filteredRows = (pData as List).cast<Map<String, dynamic>>();
  final rowsToUse = filteredRows.isNotEmpty
      ? filteredRows
      : (await supabase.from('providers').select('*').inFilter('id', providerIds).order('rating', ascending: false))
          as List;

  return rowsToUse.map((e) {
    final p = ProviderModel.fromJson(Map<String, dynamic>.from(e as Map));
    return ProviderModel(
      id: p.id,
      businessName: p.businessName,
      name: p.name,
      location: p.location,
      rating: p.rating,
      about: p.about,
      price: priceMap[p.id] ?? p.price,
      imageUrl: p.imageUrl,
      verified: p.verified,
    );
  }).toList();
}

// ── Bookings ──────────────────────────────────────────────────

Future<List<BookingModel>> getCustomerBookings(String customerId) async {
  final data = await supabase
      .from('bookings')
      .select(
        '*, provider:providers!bookings_provider_id_fkey(business_name), service:services!bookings_service_id_fkey(name)',
      )
      .eq('customer_id', customerId)
      .order('created_at', ascending: false);
  return (data as List).map((e) => BookingModel.fromJson(e)).toList();
}

Future<BookingModel> createBooking({
  required String customerId,
  required String providerId,
  required String serviceId,
  required String serviceTitle,
  required String providerName,
  required String customerName,
  required String bookingDate,
  required String bookingTime,
  required String address,
  String? notes,
  double amount = 0,
  double depositAmount = 0,
  String paymentStatus = 'pending',
  String paymentMethod = '',
  String paymentReference = '',
}) async {
  final scheduledDate = '${bookingDate}T${bookingTime.length == 5 ? '$bookingTime:00' : bookingTime}';
  final data = await supabase
      .from('bookings')
      .insert({
        'customer_id': customerId,
        'provider_id': providerId,
        'service_id': serviceId,
        'service_title': serviceTitle,
        'provider_name': providerName,
        'customer_name': customerName,
        'scheduled_date': scheduledDate,
        'booking_date': bookingDate,
        'booking_time': bookingTime,
        'address': address,
        'notes': notes ?? '',
        'amount': amount,
        'deposit_amount': depositAmount,
        'payment_status': paymentStatus,
        'payment_method': paymentMethod,
        'payment_reference': paymentReference,
        'status': 'pending',
      })
      .select()
      .single();
  return BookingModel.fromJson(data);
}

Future<void> updateBookingStatus(String bookingId, String status) async {
  await supabase.from('bookings').update({'status': status}).eq('id', bookingId);
}

Future<void> submitFeedback({
  required String bookingId,
  required String providerId,
  required String customerId,
  required int rating,
  required String comment,
}) async {
  await supabase.from('booking_feedback').insert({
    'booking_id': bookingId,
    'provider_id': providerId,
    'customer_id': customerId,
    'rating': rating,
    'comment': comment,
  });
}

Future<void> submitComplaint({
  required String bookingId,
  required String providerId,
  required String customerId,
  required String serviceId,
  required String subject,
  required String comment,
}) async {
  await supabase.from('booking_complaints').insert({
    'booking_id': bookingId,
    'provider_id': providerId,
    'customer_id': customerId,
    'service_id': serviceId,
    'subject': subject,
    'comment': comment,
  });
}

// ── Notifications ─────────────────────────────────────────────

Future<List<NotificationModel>> getNotifications(String userId) async {
  final data = await supabase
      .from('notifications')
      .select('*')
      .or('receiver_id.eq.$userId,user_id.eq.$userId')
      .order('created_at', ascending: false);
  return (data as List).map((e) => NotificationModel.fromJson(e)).toList();
}

Future<void> markNotificationRead(String notificationId) async {
  await supabase.from('notifications').update({'is_read': true, 'read': true}).eq('id', notificationId);
}

Future<void> markAllNotificationsRead(String userId) async {
  await supabase
      .from('notifications')
      .update({'is_read': true, 'read': true})
      .or('receiver_id.eq.$userId,user_id.eq.$userId');
}

// ── Chat ──────────────────────────────────────────────────────

bool isBookingChatEnabled(String status) => ['accepted', 'confirmed', 'in_progress', 'completed'].contains(status);

Future<ConversationModel?> getConversationByBooking(String bookingId) async {
  final data = await supabase
      .from('conversations')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle();
  if (data == null) return null;
  return ConversationModel.fromJson(data);
}

Future<ConversationModel> ensureConversationForBooking(String bookingId) async {
  final existing = await getConversationByBooking(bookingId);
  if (existing != null) return existing;
  try {
    final id = await supabase.rpc('ensure_booking_conversation', params: {'p_booking_id': bookingId});
    if (id != null) {
      final data = await supabase.from('conversations').select('*').eq('id', id).single();
      return ConversationModel.fromJson(data);
    }
  } catch (_) {}
  final data = await supabase.from('conversations').select('*').eq('booking_id', bookingId).single();
  return ConversationModel.fromJson(data);
}

Future<List<ChatMessage>> getMessages(String conversationId) async {
  final data = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', ascending: true);
  return (data as List).map((e) => ChatMessage.fromJson(e)).toList();
}

Future<ChatMessage> sendMessage({
  required String conversationId,
  required String senderId,
  required String message,
  String? attachmentUrl,
  String? attachmentType,
}) async {
  final data = await supabase
      .from('messages')
      .insert({
        'conversation_id': conversationId,
        'sender_id': senderId,
        'message': message,
        if (attachmentUrl != null) 'attachment_url': attachmentUrl,
        if (attachmentType != null) 'attachment_type': attachmentType,
      })
      .select()
      .single();
  return ChatMessage.fromJson(data);
}

Future<void> markConversationRead(String conversationId, String userId) async {
  await supabase
      .from('messages')
      .update({'is_read': true})
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false);
}
