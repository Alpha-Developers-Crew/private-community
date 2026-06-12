import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, Ban, RotateCcw } from 'lucide-react';
import api from '../../lib/api';
import { User } from '../../types';
import Avatar from '../../components/ui/Avatar';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'pending' | 'approved' | 'suspended'>('pending');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', tab],
    queryFn: () => api.get('/admin/users', { params: { status: tab } }).then(r => r.data.users),
  });

  const users: User[] = data || [];

  const handleApprove = async (userId: string) => {
    try {
      await api.put(`/users/${userId}/approve`);
      toast.success('User approved');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch { toast.error('Failed'); }
  };

  const handleReject = async (userId: string) => {
    try {
      await api.put(`/users/${userId}/reject`);
      toast.success('User rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch { toast.error('Failed'); }
  };

  const handleSuspend = async (userId: string) => {
    try {
      await api.put(`/users/${userId}/suspend`);
      toast.success('User suspended');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch { toast.error('Failed'); }
  };

  const handleUnsuspend = async (userId: string) => {
    try {
      await api.put(`/users/${userId}/unsuspend`);
      toast.success('User unsuspended');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch { toast.error('Failed'); }
  };

  const tabs = [
    { key: 'pending' as const, label: 'Pending' },
    { key: 'approved' as const, label: 'Approved' },
    { key: 'suspended' as const, label: 'Suspended' },
  ];

  return (
    <div className="h-full overflow-y-auto p-4">
      <h1 className="text-xl font-bold text-surface-100 mb-4">User Management</h1>

      <div className="flex gap-1 p-1 bg-surface-900 rounded-lg w-fit mb-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-surface-500">Loading...</p>
      ) : users.length === 0 ? (
        <p className="text-surface-500">No users found</p>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="card flex items-center gap-3">
              <Avatar src={u.avatar_url} name={u.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-200">{u.name}</p>
                <p className="text-xs text-surface-500">@{u.username} &middot; {u.email}</p>
                <p className="text-xs text-surface-500">Joined {format(new Date(u.created_at), 'MMM d, yyyy')}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                {tab === 'pending' && (
                  <>
                    <button onClick={() => handleApprove(u.id)} className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors" title="Approve">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleReject(u.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors" title="Reject">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
                {tab === 'approved' && (
                  <button onClick={() => handleSuspend(u.id)} className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-colors" title="Suspend">
                    <Ban className="w-4 h-4" />
                  </button>
                )}
                {tab === 'suspended' && (
                  <button onClick={() => handleUnsuspend(u.id)} className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors" title="Unsuspend">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
