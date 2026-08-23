import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/provider_booking.dart';
import '../widgets/status_chip.dart';
import '../screens/booking_details_page.dart';

final _dateFormat = DateFormat('dd MMM, h:mm a');
final _moneyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');

class BookingListTile extends StatelessWidget {
  const BookingListTile({super.key, required this.booking, this.onChanged});

  final ProviderBooking booking;
  final VoidCallback? onChanged;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: () async {
          await Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => BookingDetailsPage(bookingId: booking.id),
            ),
          );
          onChanged?.call();
        },
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            booking.serviceTitle,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (booking.bookingCode != null)
                          Text(
                            '#${booking.bookingCode}',
                            style: TextStyle(
                              fontSize: 11,
                              color: Theme.of(context).colorScheme.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      booking.customerName,
                      style: const TextStyle(
                        color: Color(0xFF6B7280),
                        fontSize: 13,
                      ),
                    ),
                    if (booking.scheduledDate != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        _dateFormat.format(booking.scheduledDate!.toLocal()),
                        style: const TextStyle(
                          color: Color(0xFF9CA3AF),
                          fontSize: 12,
                        ),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        StatusChip(status: booking.status),
                        const Spacer(),
                        Text(
                          _moneyFormat.format(booking.amount),
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right, color: Color(0xFFD1D5DB)),
            ],
          ),
        ),
      ),
    );
  }
}
