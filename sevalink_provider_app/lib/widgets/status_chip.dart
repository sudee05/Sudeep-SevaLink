import 'package:flutter/material.dart';

class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final (color, icon) = switch (status) {
      'accepted' || 'confirmed' || 'approved' => (Colors.green, Icons.check_circle_outline),
      'completed' => (Colors.blue, Icons.done_all),
      'rejected' || 'cancelled' || 'denied' => (Colors.red, Icons.cancel_outlined),
      'in_progress' => (Colors.indigo, Icons.autorenew),
      'reschedule_requested' => (Colors.orange, Icons.event_repeat_outlined),
      _ => (Colors.orange, Icons.hourglass_empty_outlined),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 4),
          Text(
            status.replaceAll('_', ' '),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color.withValues(alpha: 0.9),
            ),
          ),
        ],
      ),
    );
  }
}
