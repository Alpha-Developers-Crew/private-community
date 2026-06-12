import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Hash, Plus, Edit2, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { Channel } from '../../types';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

export default function AdminChannels() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get('/channels').then(r => r.data.channels),
  });

  const channels: Channel[] = data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;
    setLoading(true);
    try {
      await api.post('/channels', { name: channelName });
      toast.success('Channel created');
      setCreateOpen(false);
      setChannelName('');
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim() || !editingChannel) return;
    setLoading(true);
    try {
      await api.put(`/channels/${editingChannel.id}`, { name: channelName });
      toast.success('Channel renamed');
      setEditOpen(false);
      setChannelName('');
      setEditingChannel(null);
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (channel: Channel) => {
    if (!confirm(`Delete #${channel.name}?`)) return;
    try {
      await api.delete(`/channels/${channel.id}`);
      toast.success('Channel deleted');
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    } catch {
      toast.error('Failed');
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-surface-100">Channels</h1>
        <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Create
        </button>
      </div>

      {isLoading ? (
        <p className="text-surface-500">Loading...</p>
      ) : (
        <div className="space-y-1">
          {channels.map(ch => (
            <div key={ch.id} className="card flex items-center gap-3">
              <Hash className="w-5 h-5 text-surface-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-surface-200">#{ch.name}</p>
                <p className="text-xs text-surface-500">Created by {ch.created_by_name || 'System'}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditingChannel(ch); setChannelName(ch.name); setEditOpen(true); }}
                  className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-surface-400" />
                </button>
                <button
                  onClick={() => handleDelete(ch)}
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Channel">
        <form onSubmit={handleCreate} className="space-y-3">
          <input type="text" value={channelName} onChange={e => setChannelName(e.target.value)} className="input-field" placeholder="channel-name" />
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Creating...' : 'Create'}</button>
        </form>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Rename Channel">
        <form onSubmit={handleRename} className="space-y-3">
          <input type="text" value={channelName} onChange={e => setChannelName(e.target.value)} className="input-field" />
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving...' : 'Save'}</button>
        </form>
      </Modal>
    </div>
  );
}
