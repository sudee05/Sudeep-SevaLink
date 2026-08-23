import 'package:flutter/material.dart';

import '../models/chat_message.dart';
import '../models/provider_booking.dart';
import '../services/provider_api.dart';
import '../widgets/section_card.dart';

class BookingChatCard extends StatefulWidget {
  const BookingChatCard(
      {super.key, required this.booking, required this.userId});

  final ProviderBooking booking;
  final String userId;

  @override
  State<BookingChatCard> createState() => _BookingChatCardState();
}

class _BookingChatCardState extends State<BookingChatCard> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  String? _conversationId;
  List<ChatMessage> _messages = [];
  bool _loading = true;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant BookingChatCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.booking.id != widget.booking.id ||
        oldWidget.booking.status != widget.booking.status) {
      _load();
    }
  }

  Future<void> _load() async {
    if (!ProviderApi.isChatEnabled(widget.booking.status)) {
      if (mounted) {
        setState(() {
          _conversationId = null;
          _messages = [];
          _loading = false;
        });
      }
      return;
    }
    if (mounted) setState(() => _loading = true);
    try {
      final conversationId =
          await ProviderApi.ensureConversation(widget.booking.id);
      final messages = conversationId == null
          ? <ChatMessage>[]
          : await ProviderApi.getMessages(conversationId);
      if (conversationId != null) {
        await ProviderApi.markConversationRead(conversationId, widget.userId);
      }
      if (mounted) {
        setState(() {
          _conversationId = conversationId;
          _messages = messages;
          _loading = false;
        });
        _scrollToBottom();
      }
    } catch (error) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    final conversationId = _conversationId;
    if (text.isEmpty || conversationId == null) return;
    setState(() => _sending = true);
    try {
      await ProviderApi.sendMessage(
        conversationId: conversationId,
        senderId: widget.userId,
        message: text,
      );
      _controller.clear();
      await _load();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!ProviderApi.isChatEnabled(widget.booking.status)) {
      return SectionCard(
        title: 'Messages',
        child: Row(
          children: [
            Icon(
              Icons.lock_outline,
              size: 16,
              color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.5),
            ),
            const SizedBox(width: 8),
            const Text('Chat unlocks after you accept the booking.'),
          ],
        ),
      );
    }

    return SectionCard(
      title: 'Messages',
      child: Column(
        children: [
          if (_loading)
            const Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator())
          else if (_messages.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Text(
                'No messages yet. Say hello!',
                style: TextStyle(color: Color(0xFF9CA3AF)),
              ),
            )
          else
            SizedBox(
              height: 280,
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.only(bottom: 4),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final msg = _messages[index];
                  final mine = msg.senderId == widget.userId;
                  return Align(
                    alignment:
                        mine ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.symmetric(vertical: 3),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      constraints: const BoxConstraints(maxWidth: 260),
                      decoration: BoxDecoration(
                        color: mine
                            ? Theme.of(context).colorScheme.primary
                            : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.only(
                          topLeft: const Radius.circular(12),
                          topRight: const Radius.circular(12),
                          bottomLeft: Radius.circular(mine ? 12 : 2),
                          bottomRight: Radius.circular(mine ? 2 : 12),
                        ),
                      ),
                      child: Text(
                        msg.message,
                        style: TextStyle(
                          color: mine ? Colors.white : Colors.black87,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  decoration: const InputDecoration(
                    hintText: 'Type a message…',
                    isDense: true,
                  ),
                  minLines: 1,
                  maxLines: 3,
                  onSubmitted: (_) => _send(),
                  textInputAction: TextInputAction.send,
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                tooltip: 'Send',
                onPressed: _sending ? null : _send,
                icon: _sending
                    ? const SizedBox(
                        height: 16,
                        width: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.send_rounded),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
