import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCheck, Image, Paperclip, Send } from 'lucide-react'
import { useConversationByBookingQuery, useMessagesQuery } from '@/hooks/use-queries'
import { useRealtimeConversation } from '@/hooks/use-realtime'
import {
  ensureConversationForBooking,
  isBookingChatEnabled,
  markConversationRead,
  sendMessage,
  uploadChatAttachment,
} from '@/services/supabaseApi'
import { formatDate } from '@/utils/format'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/common/section-header'

export function BookingChatPanel({ booking, userId }) {
  const queryClient = useQueryClient()
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const [message, setMessage] = useState('')
  const [attachment, setAttachment] = useState(null)
  const chatEnabled = isBookingChatEnabled(booking?.status)
  const conversationQuery = useConversationByBookingQuery(booking?.id)
  const conversation = conversationQuery.data
  const messagesQuery = useMessagesQuery(conversation?.id)
  const messages = messagesQuery.data || []

  useRealtimeConversation(conversation?.id, userId)

  useEffect(() => {
    if (!chatEnabled || conversation || !booking?.id) return
    ensureConversationForBooking(booking.id).then(() => {
      queryClient.invalidateQueries({ queryKey: ['conversation', 'booking', booking.id] })
    })
  }, [booking?.id, chatEnabled, conversation, queryClient])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    if (!conversation?.id || !userId || !messages.length) return
    markConversationRead(conversation.id, userId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] })
    })
  }, [conversation?.id, messages.length, queryClient, userId])

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!conversation?.id || !userId) return null
      let uploaded = null
      if (attachment) {
        uploaded = await uploadChatAttachment({ conversationId: conversation.id, file: attachment })
      }
      return sendMessage({
        conversationId: conversation.id,
        senderId: userId,
        message: message.trim(),
        attachmentUrl: uploaded?.url,
        attachmentPath: uploaded?.path,
        attachmentType: uploaded?.type,
      })
    },
    onSuccess: () => {
      setMessage('')
      setAttachment(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      queryClient.invalidateQueries({ queryKey: ['messages', conversation?.id] })
    },
  })

  function handleSubmit(event) {
    event.preventDefault()
    if (!message.trim() && !attachment) return
    sendMutation.mutate()
  }

  if (!chatEnabled) {
    return (
      <Card className="text-sm text-muted-foreground">
        Chat will be available after provider accepts the booking.
      </Card>
    )
  }

  return (
    <Card className="space-y-4">
      <SectionHeader title="Messages" subtitle="Realtime customer and provider chat for this booking." />
      <div className="h-80 space-y-3 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3">
        {messagesQuery.isLoading || conversationQuery.isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading conversation...</p>
        ) : messages.length ? (
          messages.map((item) => {
            const mine = item.sender_id === userId
            return (
              <div key={item.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${mine ? 'bg-primary text-white' : 'bg-card border border-border'}`}>
                  {item.attachment_url && (
                    <a href={item.attachment_url} target="_blank" rel="noreferrer" className="mb-2 block overflow-hidden rounded-xl border border-border/50">
                      {item.attachment_type?.startsWith('image/') ? (
                        <img src={item.attachment_url} alt="Chat attachment" className="max-h-56 w-full object-cover" />
                      ) : (
                        <span className="flex items-center gap-2 p-3">
                          <Paperclip className="h-4 w-4" /> Attachment
                        </span>
                      )}
                    </a>
                  )}
                  {item.message && <p>{item.message}</p>}
                  <div className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${mine ? 'text-white/75' : 'text-muted-foreground'}`}>
                    {formatDate(item.created_at)}
                    {mine && item.is_read && <CheckCheck className="h-3 w-3" />}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">No messages yet.</p>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form className="flex flex-wrap items-center gap-2" onSubmit={handleSubmit}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => setAttachment(event.target.files?.[0] || null)}
        />
        <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} aria-label="Attach image">
          <Image className="h-4 w-4" />
        </Button>
        <Input className="min-w-0 flex-1" placeholder="Type a message" value={message} onChange={(event) => setMessage(event.target.value)} />
        <Button type="submit" disabled={sendMutation.isPending || (!message.trim() && !attachment)}>
          <Send className="h-4 w-4" />
          {sendMutation.isPending ? 'Sending...' : 'Send'}
        </Button>
        {attachment && <span className="w-full text-xs text-muted-foreground">{attachment.name}</span>}
      </form>
    </Card>
  )
}
