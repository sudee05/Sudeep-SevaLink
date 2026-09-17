import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/provider_booking.dart';
import '../services/provider_api.dart';
import '../widgets/booking_chat_card.dart';
import '../widgets/detail_row.dart';
import '../widgets/section_card.dart';
import '../widgets/status_chip.dart';

final _dateFormat = DateFormat('dd MMM yyyy, h:mm a');
final _moneyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');

void _showError(BuildContext context, Object error) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(error.toString().replaceFirst('Exception: ', '')),
      backgroundColor: Theme.of(context).colorScheme.error,
    ),
  );
}

class BookingDetailsPage extends StatefulWidget {
  const BookingDetailsPage({super.key, required this.bookingId});

  final String bookingId;

  @override
  State<BookingDetailsPage> createState() => _BookingDetailsPageState();
}

class _BookingDetailsPageState extends State<BookingDetailsPage> {
  late Future<ProviderBooking> _future =
      ProviderApi.getBookingById(widget.bookingId);
  bool _changed = false;
  String? _updatingStatus;

  void _reload() {
    setState(() {
      _future = ProviderApi.getBookingById(widget.bookingId);
    });
  }

  Future<void> _setStatus(ProviderBooking booking, String status) async {
    // Reschedule opens a date picker dialog
    if (status == 'reschedule_requested') {
      await _showRescheduleDialog(booking);
      return;
    }
    // Accept customer's counter-proposed time
    if (status == 'accept_counter') {
      setState(() => _updatingStatus = status);
      try {
        await ProviderApi.acceptCounterReschedule(widget.bookingId);
        _changed = true;
        _reload();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Counter-reschedule accepted. Booking updated.')),
          );
        }
      } catch (error) {
        if (mounted) _showError(context, error);
      } finally {
        if (mounted) setState(() => _updatingStatus = null);
      }
      return;
    }
    if (status == 'cancelled' && !await _confirmCancellation()) return;
    setState(() => _updatingStatus = status);
    try {
      if (status == 'cancelled') {
        await ProviderApi.cancelBookingWithRefund(widget.bookingId);
      } else {
        await ProviderApi.updateBookingStatus(widget.bookingId, status);
      }
      _changed = true;
      _reload();
      if (mounted) {
        final message = status == 'cancelled'
            ? 'Booking cancelled. Refund notification sent to the customer.'
            : 'Booking marked ${status.replaceAll('_', ' ')}';
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(message)));
      }
    } catch (error) {
      if (mounted) _showError(context, error);
    } finally {
      if (mounted) setState(() => _updatingStatus = null);
    }
  }

  Future<void> _showRescheduleDialog(ProviderBooking booking) async {
    DateTime? pickedDate;
    TimeOfDay? pickedTime;
    final noteCtrl = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Propose New Time'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${booking.rescheduleCount}/3 reschedules used',
                  style: TextStyle(fontSize: 12, color: Theme.of(ctx).colorScheme.error)),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.calendar_today, size: 14),
                      label: Text(pickedDate != null
                          ? _dateFormat.format(pickedDate!).split(',').first
                          : 'Pick Date'),
                      onPressed: () async {
                        final d = await showDatePicker(
                          context: ctx,
                          initialDate: DateTime.now().add(const Duration(days: 1)),
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(const Duration(days: 90)),
                        );
                        if (d != null) setDialogState(() => pickedDate = d);
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.access_time, size: 14),
                      label: Text(pickedTime != null
                          ? pickedTime!.format(ctx)
                          : 'Pick Time'),
                      onPressed: () async {
                        final t = await showTimePicker(
                          context: ctx,
                          initialTime: TimeOfDay.now(),
                        );
                        if (t != null) setDialogState(() => pickedTime = t);
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: noteCtrl,
                decoration: const InputDecoration(
                  hintText: 'Reason (optional)',
                  isDense: true,
                ),
                maxLines: 2,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Send Reschedule'),
            ),
          ],
        ),
      ),
    );

    if (confirmed != true || pickedDate == null || pickedTime == null) return;

    setState(() => _updatingStatus = 'reschedule_requested');
    try {
      final proposedDt = DateTime(
        pickedDate!.year, pickedDate!.month, pickedDate!.day,
        pickedTime!.hour, pickedTime!.minute,
      );
      await ProviderApi.proposeReschedule(
        widget.bookingId,
        proposedDt,
        note: noteCtrl.text.trim(),
      );
      _changed = true;
      _reload();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Reschedule request sent to customer.')),
        );
      }
    } catch (error) {
      if (mounted) _showError(context, error);
    } finally {
      noteCtrl.dispose();
      if (mounted) setState(() => _updatingStatus = null);
    }
  }

  Future<bool> _confirmCancellation() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Booking?'),
        content: const Text(
          'The customer will be notified that the paid amount will be refunded in 2–3 working days.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Keep Booking'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Cancel Booking'),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Booking Details'),
        leading: BackButton(
            onPressed: () => Navigator.of(context).pop(_changed)),
      ),
      body: FutureBuilder<ProviderBooking>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (!snapshot.hasData) {
            return const Center(child: Text('Booking not found'));
          }
          final booking = snapshot.data!;
          final userId = ProviderApi.currentUser?.id;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Booking Info
              SectionCard(
                title: booking.bookingCode != null
                    ? 'Booking #${booking.bookingCode}'
                    : 'Booking Details',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    DetailRow(label: 'Customer', value: booking.customerName),
                    DetailRow(label: 'Phone', value: booking.customerPhone),
                    DetailRow(label: 'Service', value: booking.serviceTitle),
                    DetailRow(
                      label: 'Scheduled',
                      value: booking.scheduledDate == null
                          ? '-'
                          : _dateFormat
                              .format(booking.scheduledDate!.toLocal()),
                    ),
                    DetailRow(
                      label: 'Amount',
                      value: _moneyFormat.format(booking.amount),
                    ),
                    DetailRow(
                      label: 'Payment',
                      value: booking.paymentStatus.replaceAll('_', ' '),
                    ),
                    DetailRow(
                      label: 'Address',
                      value: booking.address.isEmpty ? '-' : booking.address,
                    ),
                    DetailRow(
                      label: 'Notes',
                      value: booking.notes.isEmpty ? '-' : booking.notes,
                    ),
                    const SizedBox(height: 12),
                    // Status + Actions
                    StatusChip(status: booking.status),
                    if (booking.rescheduleCount > 0) ...[
                      const SizedBox(height: 6),
                      Text(
                        '⚠️ ${booking.rescheduleCount}/3 reschedules used',
                        style: TextStyle(fontSize: 11, color: Colors.orange.shade700),
                      ),
                    ],
                    const SizedBox(height: 12),

                    // Proposed date banners
                    if (booking.status == 'reschedule_requested' && booking.proposedBy == 'provider') ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(10),
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: Colors.blue.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.blue.withValues(alpha: 0.3)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('⏳ Waiting for customer response',
                                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                            const SizedBox(height: 4),
                            Text(
                              'Proposed: ${booking.proposedDate != null ? _dateFormat.format(booking.proposedDate!.toLocal()) : "N/A"}',
                              style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12),
                            ),
                            if (booking.rescheduleNote != null && booking.rescheduleNote!.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text('"${booking.rescheduleNote}"',
                                    style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic)),
                              ),
                          ],
                        ),
                      ),
                    ],
                    if (booking.status == 'reschedule_counter') ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(10),
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: Colors.amber.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('🔄 Customer proposed a different time',
                                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                            const SizedBox(height: 4),
                            Text(
                              booking.proposedDate != null
                                  ? _dateFormat.format(booking.proposedDate!.toLocal())
                                  : 'N/A',
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                            ),
                            if (booking.rescheduleNote != null && booking.rescheduleNote!.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text('"${booking.rescheduleNote}"',
                                    style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic)),
                              ),
                          ],
                        ),
                      ),
                    ],

                    _buildActions(booking),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              if (userId != null)
                BookingChatCard(booking: booking, userId: userId),
            ],
          );
        },
      ),
    );
  }

  Widget _buildActions(ProviderBooking booking) {
    final actions = statusActions(booking.status, rescheduleCount: booking.rescheduleCount);
    if (actions.isEmpty) return const SizedBox.shrink();

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: actions.map((action) {
        final isCancel = action.status == 'cancelled';
        final isPrimary =
            action.status == 'accepted' || action.status == 'completed' || action.status == 'accept_counter';
        final loading = _updatingStatus == action.status;

        return FilledButton.tonal(
          onPressed: _updatingStatus == null
              ? () => _setStatus(booking, action.status)
              : null,
          style: FilledButton.styleFrom(
            backgroundColor: isCancel
                ? Colors.red.withValues(alpha: 0.12)
                : isPrimary
                    ? Theme.of(context)
                        .colorScheme
                        .primary
                        .withValues(alpha: 0.12)
                    : null,
            foregroundColor: isCancel
                ? Colors.red
                : isPrimary
                    ? Theme.of(context).colorScheme.primary
                    : null,
          ),
          child: loading
              ? const SizedBox(
                  height: 16,
                  width: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text(action.label),
        );
      }).toList(),
    );
  }
}
