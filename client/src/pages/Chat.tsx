import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Hash, Send, Image as ImageIcon, Loader2, MessageSquare } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/ui/Avatar';
import FilePreview from '../components/ui/FilePreview';
import { Channel, Message } from '../types';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

export default function Chat() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: channelsData } = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get('/channels').then(r => r.data.channels),
  });

  const channels: Channel[] = channelsData || [];

  const { data: messagesData, isLoading: msgsLoading } = useQuery({
    queryKey: ['messages', channelId],
    queryFn: () => api.get(`/messages/${channelId}`).then(r => r.data.messages),
    enabled: !!channelId,
    refetchInterval: 2000,
  });

  const messages: Message[] = messagesData || [];
  const activeChannel = channels.find(c => c.id === channelId);

  if (!channelId && channels.length > 0) {
    navigate(`/chat/${channels[0].id}`, { replace: true });
  }

  const handleSend = async () => {
    if (!message.trim() || !channelId) return;
    try {
      await api.post(`/messages/${channelId}`, { content: message.trim() });
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    } catch { toast.error('Failed to send'); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !channelId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await api.post(`/messages/${channelId}`, {
        content: '',
        image_url: ['image/jpeg', 'image/png', 'image/gif'].includes(res.data.file_type) ? res.data.url : '',
        file_url: !['image/jpeg', 'image/png', 'image/gif'].includes(res.data.file_type) ? res.data.url : '',
        file_name: file.name,
      });

      toast.success('File uploaded');
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  if (!channelId) {
    return <div className="flex items-center justify-center h-full"><p className="text-surface-500">Select a channel</p></div>;
  }

  return (
    <div className="flex h-full">
      <div className="w-56 bg-surface-900 border-r border-surface-800 shrink-0 hidden md:flex flex-col">
        <div className="p-3 border-b border-surface-800">
          <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Channels</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {channels.map(ch => (
            <button key={ch.id} onClick={() => navigate(`/chat/${ch.id}`)} className={clsx('flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors', ch.id === channelId ? 'bg-primary-600/15 text-primary-400' : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800')}>
              <Hash className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{ch.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-3 border-b border-surface-800 bg-surface-900/50">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-surface-400" />
            <h2 className="font-semibold text-surface-100">{activeChannel?.name || 'Chat'}</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {msgsLoading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 text-surface-500 animate-spin" /></div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-surface-500">
              <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-surface-400 font-medium">Welcome to #{activeChannel?.name}</p>
              <p className="text-sm">Be the first to say something!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex gap-3 group">
                <Avatar src={msg.user_avatar} name={msg.user_name || 'U'} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-surface-200">{msg.user_name}</span>
                    <span className="text-xs text-surface-500">{format(new Date(msg.created_at), 'h:mm a')}</span>
                  </div>
                  {msg.content && <p className="text-sm text-surface-300 mt-0.5 whitespace-pre-wrap">{msg.content}</p>}
                  {msg.image_url && <FilePreview url={msg.image_url} className="mt-1" />}
                  {msg.file_url && <FilePreview url={msg.file_url} fileName={msg.file_name} className="mt-1" />}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t border-surface-800 bg-surface-900/50">
          <div className="flex items-end gap-2">
            <textarea value={message} onChange={e => setMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder={`Message #${activeChannel?.name || 'channel'}`} className="input-field resize-none py-2.5 max-h-32 flex-1" rows={1} />
            <button onClick={() => fileInputRef.current?.click()} className="p-2.5 hover:bg-surface-700 rounded-lg transition-colors" disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 text-surface-400 animate-spin" /> : <ImageIcon className="w-4 h-4 text-surface-400" />}
            </button>
            <button onClick={handleSend} disabled={!message.trim()} className="btn-primary p-2.5 rounded-lg">
              <Send className="w-4 h-4" />
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf,.zip,.mp4" className="hidden" onChange={handleFileUpload} />
        </div>
      </div>
    </div>
  );
}
