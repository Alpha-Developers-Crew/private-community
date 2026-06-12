import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Image, Trash2, Plus } from 'lucide-react';
import api from '../../lib/api';
import { Notice, Memory } from '../../types';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

type Tab = 'notices' | 'memories';

export default function AdminContent() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('notices');
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeForm, setNoticeForm] = useState({ title: '', message: '', attachment_url: '' });

  const { data: notices } = useQuery({
    queryKey: ['admin-notices'],
    queryFn: () => api.get('/admin/notices').then(r => r.data.notices),
  });

  const { data: memories } = useQuery({
    queryKey: ['admin-memories'],
    queryFn: () => api.get('/admin/memories').then(r => r.data.memories),
  });

  const noticeList: Notice[] = notices || [];
  const memoryList: Memory[] = memories || [];

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/notices', noticeForm);
      toast.success('Notice created');
      setNoticeOpen(false);
      setNoticeForm({ title: '', message: '', attachment_url: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
    } catch {
      toast.error('Failed');
    }
  };

  const handleDeleteNotice = async (id: string) => {
    try {
      await api.delete(`/notices/${id}`);
      toast.success('Notice deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      queryClient.invalidateQueries({ queryKey: ['notices'] });
    } catch {
      toast.error('Failed');
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await api.delete(`/memories/${id}`);
      toast.success('Memory deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-memories'] });
      queryClient.invalidateQueries({ queryKey: ['memories'] });
    } catch {
      toast.error('Failed');
    }
  };

  const tabs = [
    { key: 'notices' as Tab, label: 'Notices', icon: Bell },
    { key: 'memories' as Tab, label: 'Memories', icon: Image },
  ];

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-surface-100">Content Management</h1>
        {tab === 'notices' && (
          <button onClick={() => setNoticeOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Notice
          </button>
        )}
      </div>

      <div className="flex gap-1 p-1 bg-surface-900 rounded-lg w-fit mb-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'notices' && (
        <div className="space-y-2">
          {noticeList.map(n => (
            <div key={n.id} className="card flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-surface-200">{n.title}</p>
                <p className="text-xs text-surface-400 mt-1">{n.message}</p>
                <p className="text-xs text-surface-500 mt-1">By {n.created_by_name}</p>
              </div>
              <button onClick={() => handleDeleteNotice(n.id)} className="p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'memories' && (
        <div className="space-y-2">
          {memoryList.map(m => (
            <div key={m.id} className="card flex items-start gap-3">
              {m.file_type?.startsWith('image') && (
                <img src={m.file_url} alt="" className="w-12 h-12 rounded object-cover" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-surface-200">{m.title}</p>
                <p className="text-xs text-surface-500">By {m.uploader_name}</p>
              </div>
              <button onClick={() => handleDeleteMemory(m.id)} className="p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={noticeOpen} onClose={() => setNoticeOpen(false)} title="Create Notice">
        <form onSubmit={handleCreateNotice} className="space-y-3">
          <input type="text" value={noticeForm.title} onChange={e => setNoticeForm(p => ({ ...p, title: e.target.value }))} className="input-field" placeholder="Title" required />
          <textarea value={noticeForm.message} onChange={e => setNoticeForm(p => ({ ...p, message: e.target.value }))} className="input-field" rows={4} placeholder="Message..." />
          <input type="text" value={noticeForm.attachment_url} onChange={e => setNoticeForm(p => ({ ...p, attachment_url: e.target.value }))} className="input-field" placeholder="Attachment URL (optional)" />
          <button type="submit" className="btn-primary w-full">Publish Notice</button>
        </form>
      </Modal>
    </div>
  );
}
