import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import '../../models/models.dart';
import '../../providers/app_providers.dart';
import '../../services/supabase_api.dart' as api;
import '../../theme/app_theme.dart';

final _singleBookingProvider = FutureProvider.autoDispose.family<List<BookingModel>, String>(
    (ref, customerId) => api.getCustomerBookings(customerId));
final _messagesProvider =
    FutureProvider.autoDispose.family<List<ChatMessage>, String>((ref, conversationId) => api.getMessages(conversationId));

class BookingDetailScreen extends ConsumerStatefulWidget {
  final String bookingId;
  const BookingDetailScreen({super.key, required this.bookingId});

  @override
  ConsumerState<BookingDetailScreen> createState() => _BookingDetailScreenState();
}

class _BookingDetailScreenState extends ConsumerState<BookingDetailScreen> {
  int _tab = 0; // 0=details, 1=chat, 2=feedback, 3=complaint

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(authProvider).profile;
    final bookingsAsync = ref.watch(_singleBookingProvider(profile?.id ?? ''));

    final booking = bookingsAsync.value?.firstWhere(
      (b) => b.id == widget.bookingId,
      orElse: () => bookingsAsync.value?.firstOrNull ?? BookingModel(id: widget.bookingId, status: 'pending'),
    );

    return Scaffold(
      appBar: AppBar(
        title: Text('Booking ${booking?.bookingCode ?? widget.bookingId.substring(0, 8)}'),
      ),
      body: bookingsAsync.when(
        data: (_) => booking == null
            ? const Center(child: Text('Booking not found'))
            : Column(
                children: [
                  // Tab bar
                  Container(
                    color: Theme.of(context).colorScheme.surface,
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      child: Row(
                        children: [
                          _TabChip('Details', 0, _tab, (i) => setState(() => _tab = i)),
                          _TabChip('Chat', 1, _tab, (i) => setState(() => _tab = i)),
                          _TabChip('Feedback', 2, _tab, (i) => setState(() => _tab = i)),
                          _TabChip('Complaint', 3, _tab, (i) => setState(() => _tab = i)),
                        ],
                      ),
                    ),
                  ),
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: _buildTabContent(booking, profile?.id ?? ''),
                    ),
                  ),
                ],
              ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }

  Widget _buildTabContent(BookingModel booking, String userId) {
    switch (_tab) {
      case 0:
        return _DetailsTab(booking: booking, onStatusChanged: () => ref.invalidate(_singleBookingProvider));
      case 1:
        return _ChatTab(booking: booking, userId: userId);
      case 2:
        return _FeedbackTab(booking: booking, userId: userId);
      case 3:
        return _ComplaintTab(booking: booking, userId: userId);
      default:
        return const SizedBox.shrink();
    }
  }
}

// ── Tab widgets ───────────────────────────────────────────────

class _TabChip extends StatelessWidget {
  final String label;
  final int index;
  final int current;
  final ValueChanged<int> onTap;

  const _TabChip(this.label, this.index, this.current, this.onTap);

  @override
  Widget build(BuildContext context) {
    final selected = index == current;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: () => onTap(index),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: selected ? AppColors.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: selected ? AppColors.primary : AppColors.darkBorder),
          ),
          child: Text(label,
              style: TextStyle(
                color: selected ? Colors.white : null,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                fontSize: 13,
              )),
        ),
      ),
    );
  }
}

class _DetailsTab extends ConsumerWidget {
  final BookingModel booking;
  final VoidCallback onStatusChanged;

  const _DetailsTab({required this.booking, required this.onStatusChanged});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final fmt = DateFormat('dd MMM yyyy, hh:mm a');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Booking Details', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const SizedBox(height: 12),
                _DetailRow(Icons.home_repair_service_outlined, 'Service', booking.serviceTitle ?? '-'),
                _DetailRow(Icons.person_outline, 'Provider', booking.providerName ?? '-'),
                if (booking.scheduledDate != null)
                  _DetailRow(Icons.calendar_today_outlined, 'Scheduled', fmt.format(booking.scheduledDate!)),
                if (booking.address != null)
                  _DetailRow(Icons.location_on_outlined, 'Address', booking.address!),
                const SizedBox(height: 10),
                _StatusBadge(status: booking.status),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Actions', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const SizedBox(height: 12),
                if (booking.status == 'reschedule_requested') ...[
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () async {
                        await api.updateBookingStatus(booking.id, 'reschedule_accepted');
                        onStatusChanged();
                      },
                      child: const Text('Accept Reschedule'),
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () async {
                        await api.updateBookingStatus(booking.id, 'reschedule_rejected');
                        onStatusChanged();
                      },
                      child: const Text('Reject Reschedule'),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.receipt_outlined, size: 16),
                    label: const Text('Download Invoice'),
                    onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Invoice download coming soon')),
                    ),
                  ),
                ),
                if (!['completed', 'cancelled', 'rejected'].contains(booking.status)) ...[
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
                      onPressed: () async {
                        await api.updateBookingStatus(booking.id, 'cancelled');
                        onStatusChanged();
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text('Booking cancelled'), backgroundColor: Colors.red));
                        }
                      },
                      child: const Text('Cancel Booking'),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _DetailRow(this.icon, this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 15, color: AppColors.darkMuted),
          const SizedBox(width: 8),
          Text('$label: ', style: Theme.of(context).textTheme.bodySmall),
          Expanded(
            child: Text(value,
                style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
          ),
        ],
      ),
    );
  }
}

// ── Chat Tab ──────────────────────────────────────────────────

class _ChatTab extends ConsumerStatefulWidget {
  final BookingModel booking;
  final String userId;

  const _ChatTab({required this.booking, required this.userId});

  @override
  ConsumerState<_ChatTab> createState() => _ChatTabState();
}

class _ChatTabState extends ConsumerState<_ChatTab> {
  final _messageCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  ConversationModel? _conversation;
  bool _sending = false;
  RealtimeChannel? _channel;

  @override
  void initState() {
    super.initState();
    _initConversation();
  }

  Future<void> _initConversation() async {
    if (!api.isBookingChatEnabled(widget.booking.status)) return;
    try {
      final conv = await api.ensureConversationForBooking(widget.booking.id);
      if (mounted) {
        setState(() => _conversation = conv);
        _subscribeToMessages(conv.id);
      }
    } catch (_) {}
  }

  void _subscribeToMessages(String conversationId) {
    _channel = Supabase.instance.client
        .channel('messages:$conversationId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'messages',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'conversation_id',
            value: conversationId,
          ),
          callback: (_) => ref.invalidate(_messagesProvider),
        )
        .subscribe();
  }

  @override
  void dispose() {
    _messageCtrl.dispose();
    _scrollCtrl.dispose();
    _channel?.unsubscribe();
    super.dispose();
  }

  Future<void> _send() async {
    final msg = _messageCtrl.text.trim();
    if (msg.isEmpty || _conversation == null) return;
    setState(() => _sending = true);
    _messageCtrl.clear();
    try {
      await api.sendMessage(
        conversationId: _conversation!.id,
        senderId: widget.userId,
        message: msg,
      );
      ref.invalidate(_messagesProvider);
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!api.isBookingChatEnabled(widget.booking.status)) {
      return Card(
        child: const Padding(
          padding: EdgeInsets.all(16),
          child: Text('Chat will be available after provider accepts the booking.'),
        ),
      );
    }

    final messagesAsync = _conversation != null
        ? ref.watch(_messagesProvider(_conversation!.id))
        : const AsyncValue<List<ChatMessage>>.loading();

    return Column(
      children: [
        Card(
          child: SizedBox(
            height: 350,
            child: messagesAsync.when(
              data: (messages) => messages.isEmpty
                  ? const Center(child: Text('No messages yet. Say hello!'))
                  : ListView.builder(
                      controller: _scrollCtrl,
                      padding: const EdgeInsets.all(12),
                      itemCount: messages.length,
                      itemBuilder: (ctx, i) {
                        final m = messages[i];
                        final mine = m.senderId == widget.userId;
                        return _ChatBubble(message: m, isMine: mine);
                      },
                    ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _messageCtrl,
                decoration: const InputDecoration(hintText: 'Type a message...'),
                onSubmitted: (_) => _send(),
              ),
            ),
            const SizedBox(width: 8),
            ElevatedButton(
              onPressed: _sending ? null : _send,
              style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16)),
              child: _sending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Icon(Icons.send_rounded),
            ),
          ],
        ),
      ],
    );
  }
}

class _ChatBubble extends StatelessWidget {
  final ChatMessage message;
  final bool isMine;

  const _ChatBubble({required this.message, required this.isMine});

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('hh:mm a');
    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isMine ? AppColors.primary : Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isMine ? 16 : 4),
            bottomRight: Radius.circular(isMine ? 4 : 16),
          ),
          border: isMine ? null : Border.all(color: AppColors.darkBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (message.message != null && message.message!.isNotEmpty)
              Text(message.message!,
                  style: TextStyle(
                      color: isMine ? Colors.white : null,
                      fontSize: 14)),
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  fmt.format(message.createdAt),
                  style: TextStyle(
                      fontSize: 10,
                      color: isMine ? Colors.white70 : AppColors.darkMuted),
                ),
                if (isMine && message.isRead) ...[
                  const SizedBox(width: 4),
                  const Icon(Icons.done_all, size: 12, color: Colors.white70),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Feedback Tab ──────────────────────────────────────────────

class _FeedbackTab extends ConsumerStatefulWidget {
  final BookingModel booking;
  final String userId;

  const _FeedbackTab({required this.booking, required this.userId});

  @override
  ConsumerState<_FeedbackTab> createState() => _FeedbackTabState();
}

class _FeedbackTabState extends ConsumerState<_FeedbackTab> {
  int _rating = 5;
  final _commentCtrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _loading = true);
    try {
      await api.submitFeedback(
        bookingId: widget.booking.id,
        providerId: widget.booking.providerId ?? '',
        customerId: widget.userId,
        rating: _rating,
        comment: _commentCtrl.text.trim(),
      );
      _commentCtrl.clear();
      if (mounted) showSnack(context, 'Feedback submitted. Thank you!');
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Leave Feedback', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 16),
            const Text('Rating', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(
              children: List.generate(5, (i) {
                final star = i + 1;
                return GestureDetector(
                  onTap: () => setState(() => _rating = star),
                  child: Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: Icon(
                      star <= _rating ? Icons.star_rounded : Icons.star_border_rounded,
                      color: AppColors.warning,
                      size: 36,
                    ),
                  ),
                );
              }),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _commentCtrl,
              maxLines: 3,
              decoration: const InputDecoration(hintText: 'Share feedback for the provider...'),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _submit,
                child: _loading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Submit Feedback'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Complaint Tab ─────────────────────────────────────────────

class _ComplaintTab extends ConsumerStatefulWidget {
  final BookingModel booking;
  final String userId;

  const _ComplaintTab({required this.booking, required this.userId});

  @override
  ConsumerState<_ComplaintTab> createState() => _ComplaintTabState();
}

class _ComplaintTabState extends ConsumerState<_ComplaintTab> {
  final _subjectCtrl = TextEditingController();
  final _commentCtrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _subjectCtrl.dispose();
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_subjectCtrl.text.isEmpty) {
      showSnack(context, 'Subject is required', isError: true);
      return;
    }
    setState(() => _loading = true);
    try {
      await api.submitComplaint(
        bookingId: widget.booking.id,
        providerId: widget.booking.providerId ?? '',
        customerId: widget.userId,
        serviceId: widget.booking.serviceId ?? '',
        subject: _subjectCtrl.text.trim(),
        comment: _commentCtrl.text.trim(),
      );
      _subjectCtrl.clear();
      _commentCtrl.clear();
      if (mounted) showSnack(context, 'Complaint submitted successfully.');
    } catch (e) {
      if (mounted) showSnack(context, e.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Submit Complaint', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 16),
            TextField(
              controller: _subjectCtrl,
              decoration: const InputDecoration(
                hintText: 'Subject *',
                prefixIcon: Icon(Icons.topic_outlined),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _commentCtrl,
              maxLines: 4,
              decoration: const InputDecoration(hintText: 'Describe the issue...'),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
                onPressed: _loading ? null : _submit,
                child: _loading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Submit Complaint'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Shared ────────────────────────────────────────────────────

Color _statusColor(String status) {
  switch (status) {
    case 'completed':
      return AppColors.success;
    case 'cancelled':
    case 'rejected':
      return AppColors.danger;
    default:
      return AppColors.warning;
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final color = _statusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Text(
        status.replaceAll('_', ' ').toUpperCase(),
        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700),
      ),
    );
  }
}
