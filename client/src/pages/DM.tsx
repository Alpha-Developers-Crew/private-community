import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, MessageCircle, ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/ui/Avatar';
import { DirectMessage, Conversation } from '../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function DM() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useQuery({
    queryKey: ['dm-conversations'],
    queryFn: () => api.get('/dm/conversations').then(r => r.data.conversations),
    refetchInterval: 5000,
  });

  const convList: Conversation[] = conversations || [];

  const { data: msgsData } = useQuery({
    queryKey: ['dm', userId],
    queryFn: () => api.get(`/dm/${userId}`).then(r => r.data.messages),
    enabled: !!userId,
    refetchInterval: 2000,
  });

  const msgs: DirectMessage[] = msgsData || [];
  const activeConv = convList.find(c => c.other_user_id === userId);

  const handleSend = async () => {
    if (!message.trim() || !userId) return;
    try {
      await api.post(`/dm/${userId}`, { content: message.trim() });
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['dm', userId] });
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
    } catch { toast.error('Failed to send'); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!userId) {
    return (
      <div className="flex h-full">
        <div className="w-72 bg-surface-900 border-r border-surface-800 shrink-0 hidden md:flex flex-col">
          <div className="p-3 border-b border-surface-800"><h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Direct Messages</h3></div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {convList.map(conv => (
              <button key={conv.other_user_id} onClick={() => navigate(`/dm/${conv.other_user_id}`)} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-surface-800 transition-colors">
                <Avatar src={conv.other_user_avatar} name={conv.other_user_name} size="sm" status={conv.other_user_status as any} />
                <div className="text-left min-w-0 flex-1">
                  <p className="text-sm font-medium text-surface-200 truncate">{conv.other_user_name}</p>
                  <p className="text-xs text-surface-500 truncate">{conv.last_message}</p>
                </div>
              </button>
            ))}
            {convList.length === 0 && <p className="text-xs text-surface-500 text-center py-4">No conversations</p>}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center"><MessageCircle className="w-12 h-12 text-surface-600 mx-auto mb-3" /><p className="text-surface-500">Select a conversation</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-72 bg-surface-900 border-r border-surface-800 shrink-0 hidden md:flex flex-col">
        <div className="p-3 border-b border-surface-800"><h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Direct Messages</h3></div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {convList.map(conv => (
            <button key={conv.other_user_id} onClick={() => navigate(`/dm/${conv.other_user_id}`)} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-surface-800 transition-colors">
              <Avatar src={conv.other_user_avatar} name={conv.other_user_name} size="sm" status={conv.other_user_status as any} />
              <div className="text-left min-w-0 flex-1"><p className="text-sm font-medium text-surface-200 truncate">{conv.other_user_name}</p><p className="text-xs text-surface-500 truncate">{conv.last_message}</p></div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-3 border-b border-surface-800 bg-surface-900/50 flex items-center gap-3">
          <button onClick={() => navigate('/dm')} className="md:hidden p-1 hover:bg-surface-800 rounded"><ArrowLeft className="w-5 h-5 text-surface-400" /></button>
          {activeConv && (
            <><Avatar src={activeConv.other_user_avatar} name={activeConv.other_user_name} size="sm" status={activeConv.other_user_status as any} />
              <div><h2 className="font-semibold text-surface-100 text-sm">{activeConv.other_user_name}</h2><p className="text-xs text-surface-500">@{activeConv.other_user_username}</p></div></>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {msgs.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.sender_id === user?.id ? 'flex-row-reverse' : ''}`}>
              <Avatar src={msg.sender_id === user?.id ? user?.avatar_url : activeConv?.other_user_avatar} name={msg.sender_id === user?.id ? user?.name || 'Me' : activeConv?.other_user_name || 'U'} size="sm" />
              <div className={`max-w-[70%] ${msg.sender_id === user?.id ? 'items-end' : ''}`}>
                <div className={`p-3 rounded-lg ${msg.sender_id === user?.id ? 'bg-primary-600/20 border border-primary-500/20' : 'bg-surface-800'}`}>
                  {msg.content && <p className="text-sm text-surface-200 whitespace-pre-wrap">{msg.content}</p>}
                </div>
                <p className="text-xs text-surface-500 mt-1">{format(new Date(msg.created_at), 'h:mm a')}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t border-surface-800 bg-surface-900/50">
          <div className="flex items-end gap-2">
            <textarea value={message} onChange={e => setMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." className="input-field resize-none py-2.5 max-h-32 flex-1" rows={1} />
            <button onClick={handleSend} disabled={!message.trim()} className="btn-primary p-2.5 rounded-lg"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
