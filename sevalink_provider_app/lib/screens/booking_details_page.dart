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
                    const SizedBox(height: 12),
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
    final actions = statusActions(booking.status);
    if (actions.isEmpty) return const SizedBox.shrink();

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: actions.map((action) {
        final isCancel = action.status == 'cancelled';
        final isPrimary =
            action.status == 'accepted' || action.status == 'completed';
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
