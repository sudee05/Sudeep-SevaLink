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

  factory ProviderNotification.fromJson(Map<String, dynamic> json) =>
      ProviderNotification(
        id: json['id'].toString(),
        title: json['title'] as String? ?? '',
        message: json['message'] as String? ?? '',
        bookingId: json['booking_id']?.toString(),
        isRead: (json['is_read'] ?? json['read']) as bool? ?? false,
        createdAt:
            DateTime.tryParse(json['created_at']?.toString() ?? '') ??
                DateTime.now(),
      );
}
