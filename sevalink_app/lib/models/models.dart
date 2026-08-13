// ── Models matching Supabase table shapes ──────────────────────

class AppUser {
  final String id;
  final String email;
  final String fullName;
  final String phone;
  final String role;
  final String? avatarUrl;
  final String? fcmToken;
  final String approvalStatus;

  const AppUser({
    required this.id,
    required this.email,
    required this.fullName,
    required this.phone,
    required this.role,
    this.avatarUrl,
    this.fcmToken,
    this.approvalStatus = 'approved',
  });

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as String,
        email: json['email'] as String? ?? '',
        fullName: json['full_name'] as String? ?? '',
        phone: json['phone'] as String? ?? '',
        role: json['role'] as String? ?? 'customer',
        avatarUrl: json['avatar_url'] as String?,
        fcmToken: json['fcm_token'] as String?,
        approvalStatus: json['approval_status'] as String? ?? 'approved',
      );

  AppUser copyWith({
    String? fullName,
    String? phone,
    String? avatarUrl,
    String? fcmToken,
  }) =>
      AppUser(
        id: id,
        email: email,
        fullName: fullName ?? this.fullName,
        phone: phone ?? this.phone,
        role: role,
        avatarUrl: avatarUrl ?? this.avatarUrl,
        fcmToken: fcmToken ?? this.fcmToken,
        approvalStatus: approvalStatus,
      );
}

class ServiceCategory {
  final String id;
  final String name;
  final String? icon;
  final String? color;

  const ServiceCategory({
    required this.id,
    required this.name,
    this.icon,
    this.color,
  });

  factory ServiceCategory.fromJson(Map<String, dynamic> json) => ServiceCategory(
        id: json['id'].toString(),
        name: json['name'] as String? ?? '',
        icon: json['icon'] as String?,
        color: json['color'] as String?,
      );
}

class ServiceModel {
  final String id;
  final String name;
  final String? description;
  final String? categoryId;
  final String? categoryName;

  const ServiceModel({
    required this.id,
    required this.name,
    this.description,
    this.categoryId,
    this.categoryName,
  });

  factory ServiceModel.fromJson(Map<String, dynamic> json) {
    final category = json['category'];
    return ServiceModel(
      id: json['id'].toString(),
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      categoryId: (json['category_id'] ?? category?['id'])?.toString(),
      categoryName: (json['category_name'] ?? category?['name']) as String?,
    );
  }
}

class ProviderModel {
  final String id;
  final String? businessName;
  final String? name;
  final String? location;
  final double rating;
  final String? about;
  final double? price;
  final String? imageUrl;
  final bool verified;

  const ProviderModel({
    required this.id,
    this.businessName,
    this.name,
    this.location,
    this.rating = 0,
    this.about,
    this.price,
    this.imageUrl,
    this.verified = false,
  });

  String get displayName => businessName ?? name ?? 'Provider';

  factory ProviderModel.fromJson(Map<String, dynamic> json) => ProviderModel(
        id: json['id'].toString(),
        businessName: json['business_name'] as String?,
        name: json['name'] as String?,
        location: json['location'] as String?,
        rating: (json['rating'] as num?)?.toDouble() ?? 0,
        about: (json['about'] ?? json['description']) as String?,
        price: ((json['price'] ?? json['starting_price'] ?? json['base_price'] ?? json['service_price']) as num?)
            ?.toDouble(),
        imageUrl: json['image_url'] as String?,
        verified: json['verified'] as bool? ?? false,
      );
}

class BookingModel {
  final String id;
  final String? bookingCode;
  final String? serviceTitle;
  final String? providerName;
  final String? customerName;
  final String status;
  final double amount;
  final double depositAmount;
  final String paymentStatus;
  final String? paymentMethod;
  final String? paymentReference;
  final String? address;
  final String? notes;
  final DateTime? scheduledDate;
  final String? customerId;
  final String? providerId;
  final String? serviceId;

  const BookingModel({
    required this.id,
    this.bookingCode,
    this.serviceTitle,
    this.providerName,
    this.customerName,
    required this.status,
    this.amount = 0,
    this.depositAmount = 0,
    this.paymentStatus = 'pending',
    this.paymentMethod,
    this.paymentReference,
    this.address,
    this.notes,
    this.scheduledDate,
    this.customerId,
    this.providerId,
    this.serviceId,
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    final provider = json['provider'];
    final service = json['service'];
    final dateStr = json['scheduled_date'] ?? json['booking_date'] ?? json['created_at'];
    return BookingModel(
      id: json['id'].toString(),
      bookingCode: json['booking_code'] as String?,
      serviceTitle: (json['service_title'] ?? service?['name']) as String?,
      providerName: (json['provider_name'] ?? provider?['business_name']) as String?,
      customerName: json['customer_name'] as String?,
      status: json['status'] as String? ?? 'pending',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      depositAmount: (json['deposit_amount'] as num?)?.toDouble() ?? 0,
      paymentStatus: json['payment_status'] as String? ?? 'pending',
      paymentMethod: json['payment_method'] as String?,
      paymentReference: json['payment_reference'] as String?,
      address: json['address'] as String?,
      notes: json['notes'] as String?,
      scheduledDate: dateStr != null ? DateTime.tryParse(dateStr.toString()) : null,
      customerId: json['customer_id'] as String?,
      providerId: json['provider_id'] as String?,
      serviceId: json['service_id']?.toString(),
    );
  }
}

class NotificationModel {
  final String id;
  final String title;
  final String message;
  final bool isRead;
  final DateTime createdAt;

  const NotificationModel({
    required this.id,
    required this.title,
    required this.message,
    required this.isRead,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) => NotificationModel(
        id: json['id'].toString(),
        title: json['title'] as String? ?? '',
        message: json['message'] as String? ?? '',
        isRead: (json['is_read'] ?? json['read']) as bool? ?? false,
        createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
      );
}

class ChatMessage {
  final String id;
  final String conversationId;
  final String senderId;
  final String? message;
  final String? attachmentUrl;
  final String? attachmentType;
  final bool isRead;
  final DateTime createdAt;

  const ChatMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    this.message,
    this.attachmentUrl,
    this.attachmentType,
    required this.isRead,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        id: json['id'].toString(),
        conversationId: json['conversation_id'].toString(),
        senderId: json['sender_id'].toString(),
        message: json['message'] as String?,
        attachmentUrl: json['attachment_url'] as String?,
        attachmentType: json['attachment_type'] as String?,
        isRead: json['is_read'] as bool? ?? false,
        createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
      );
}

class ConversationModel {
  final String id;
  final String bookingId;
  final String customerId;
  final String providerId;

  const ConversationModel({
    required this.id,
    required this.bookingId,
    required this.customerId,
    required this.providerId,
  });

  factory ConversationModel.fromJson(Map<String, dynamic> json) => ConversationModel(
        id: json['id'].toString(),
        bookingId: json['booking_id'].toString(),
        customerId: json['customer_id'].toString(),
        providerId: json['provider_id'].toString(),
      );
}
