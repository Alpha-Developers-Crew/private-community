import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { subscribeToChannel } from '../lib/socket';
import { useAuth } from './AuthContext';

interface NotificationState {
  unreadChat: boolean;
  unreadDMs: Set<string>;
}

interface NotificationContextType {
  unreadChat: boolean;
  unreadDMs: string[];
  clearChatNotifications: () => void;
  clearDMNotification: (userId: string) => void;
  totalUnread: number;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadChat: false,
  unreadDMs: [],
  clearChatNotifications: () => {},
  clearDMNotification: () => {},
  totalUnread: 0,
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<NotificationState>({
    unreadChat: false,
    unreadDMs: new Set(),
  });

  useEffect(() => {
    if (!user) return;

    const unsubMessages = subscribeToChannel('messages', (payload) => {
      if (payload.eventType === 'INSERT') {
        setState(prev => ({ ...prev, unreadChat: true }));
      }
    });

    const unsubDMs = subscribeToChannel('direct_messages', (payload) => {
      if (payload.eventType === 'INSERT') {
        const newMsg = payload.new as any;
        if (newMsg.sender_id !== user.id) {
          setState(prev => {
            const next = new Set(prev.unreadDMs);
            next.add(newMsg.sender_id);
            return { ...prev, unreadDMs: next };
          });
        }
      }
    });

    return () => {
      if (typeof unsubMessages === 'function') unsubMessages();
      if (typeof unsubDMs === 'function') unsubDMs();
    };
  }, [user]);

  const clearChatNotifications = useCallback(() => {
    setState(prev => ({ ...prev, unreadChat: false }));
  }, []);

  const clearDMNotification = useCallback((userId: string) => {
    setState(prev => {
      const next = new Set(prev.unreadDMs);
      next.delete(userId);
      return { ...prev, unreadDMs: next };
    });
  }, []);

  const totalUnread = (state.unreadChat ? 1 : 0) + state.unreadDMs.size;

  return (
    <NotificationContext.Provider value={{
      unreadChat: state.unreadChat,
      unreadDMs: Array.from(state.unreadDMs),
      clearChatNotifications,
      clearDMNotification,
      totalUnread,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
