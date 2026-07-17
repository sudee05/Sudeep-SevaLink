import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

function uniqueChannelName(prefix, id) {
  return `${prefix}:${id}:${crypto.randomUUID()}`
}

export function useRealtimeNotifications(userId) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return undefined

    const channel = supabase
      .channel(uniqueChannelName('notifications', userId))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `receiver_id=eq.${userId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient, userId])
}

export function useRealtimeConversation(conversationId, userId) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!conversationId) return undefined

    const channel = supabase
      .channel(uniqueChannelName('messages', conversationId))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
          if (userId) queryClient.invalidateQueries({ queryKey: ['conversations', userId] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, queryClient, userId])
}

export function useRealtimeConversations(userId) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return undefined

    const channel = supabase
      .channel(uniqueChannelName('conversations', userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['conversations', userId] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['conversations', userId] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient, userId])
}
