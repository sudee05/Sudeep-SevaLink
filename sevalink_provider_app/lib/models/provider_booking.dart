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
    this.paymentStatus = 'pending',
    this.address = '',
    this.notes = '',
    this.scheduledDate,
    this.createdAt,
    this.proposedDate,
    this.rescheduleCount = 0,
    this.rescheduleNote,
  });

  final String id;
  final String? bookingCode;
  final String? customerId;
  final String customerName;
  final String customerPhone;
  final String serviceTitle;
  final String status;
  final double amount;
  final String paymentStatus;
  final String address;
  final String notes;
  final DateTime? scheduledDate;
  final DateTime? createdAt;
  final DateTime? proposedDate;
  final int rescheduleCount;
  final String? rescheduleNote;

  factory ProviderBooking.fromJson(Map<String, dynamic> json) {
    final customer = json['customer'] as Map<String, dynamic>?;
    final service = json['service'] as Map<String, dynamic>?;
    final dateValue =
        json['scheduled_date'] ?? json['booking_date'] ?? json['created_at'];
    final proposedStr = json['proposed_date'];
    return ProviderBooking(
      id: json['id'].toString(),
      bookingCode: json['booking_code'] as String?,
      customerId: json['customer_id']?.toString(),
      customerName:
          (customer?['full_name'] ?? json['customer_name'] ?? '-') as String,
      customerPhone:
          (customer?['phone'] ?? json['customer_phone'] ?? '-') as String,
      serviceTitle:
          (service?['name'] ?? json['service_title'] ?? '-') as String,
      status: json['status'] as String? ?? 'pending',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      paymentStatus: json['payment_status'] as String? ?? 'pending',
      address: json['address'] as String? ?? '',
      notes: json['notes'] as String? ?? '',
      scheduledDate:
          dateValue == null ? null : DateTime.tryParse(dateValue.toString()),
      createdAt:
          DateTime.tryParse(json['created_at']?.toString() ?? ''),
      proposedDate:
          proposedStr == null ? null : DateTime.tryParse(proposedStr.toString()),
      rescheduleCount: (json['reschedule_count'] as int?) ?? 0,
      rescheduleNote: json['reschedule_note'] as String?,
    );
  }
}

class BookingAction {
  const BookingAction(this.label, this.status);

  final String label;
  final String status;
}

/// Returns the set of actions available for a given booking status,
/// aligned with the website provider workflow.
/// [rescheduleCount] limits reschedule to max 3.
List<BookingAction> statusActions(String status, {int rescheduleCount = 0}) {
  final canReschedule = rescheduleCount < 3;
  return switch (status) {
    'pending' => [
        const BookingAction('Accept', 'accepted'),
        if (canReschedule) const BookingAction('Reschedule', 'reschedule_requested'),
        const BookingAction('Cancel', 'cancelled'),
      ],
    'accepted' => [
        const BookingAction('In Progress', 'in_progress'),
        const BookingAction('Complete', 'completed'),
        if (canReschedule) const BookingAction('Reschedule', 'reschedule_requested'),
        const BookingAction('Cancel', 'cancelled'),
      ],
    'confirmed' => [
        const BookingAction('In Progress', 'in_progress'),
        const BookingAction('Complete', 'completed'),
        if (canReschedule) const BookingAction('Reschedule', 'reschedule_requested'),
        const BookingAction('Cancel', 'cancelled'),
      ],
    'in_progress' => [
        const BookingAction('Complete', 'completed'),
        if (canReschedule) const BookingAction('Reschedule', 'reschedule_requested'),
        const BookingAction('Cancel', 'cancelled'),
      ],
    'reschedule_requested' => const [
        BookingAction('Cancel', 'cancelled'),
      ],
    'reschedule_counter' => const [
        BookingAction('Accept Counter', 'accept_counter'),
        BookingAction('Cancel', 'cancelled'),
      ],
    _ => const [],
  };
}
