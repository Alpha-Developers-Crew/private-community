import { useQuery } from '@tanstack/react-query';
import { Users, UserCheck, Clock, MessageSquare, FileIcon, HardDrive } from 'lucide-react';
import api from '../../lib/api';
import { AdminStats } from '../../types';

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
    refetchInterval: 30000,
  });

  const stats: AdminStats | undefined = data;

  const cards = [
    { label: 'Total Users', value: stats?.total_users || 0, icon: Users, color: 'text-blue-400 bg-blue-500/10' },
    { label: 'Approved', value: stats?.approved_users || 0, icon: UserCheck, color: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Pending', value: stats?.pending_users || 0, icon: Clock, color: 'text-amber-400 bg-amber-500/10' },
    { label: 'Messages', value: stats?.total_messages || 0, icon: MessageSquare, color: 'text-purple-400 bg-purple-500/10' },
    { label: 'Files', value: stats?.total_files || 0, icon: FileIcon, color: 'text-cyan-400 bg-cyan-500/10' },
    { label: 'Storage', value: stats ? `${(stats.storage_usage / (1024 * 1024)).toFixed(1)} MB` : '0 MB', icon: HardDrive, color: 'text-pink-400 bg-pink-500/10' },
  ];

  return (
    <div className="h-full overflow-y-auto p-4">
      <h1 className="text-xl font-bold text-surface-100 mb-4">Admin Dashboard</h1>

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><p className="text-surface-500">Loading...</p></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {cards.map(card => (
            <div key={card.label} className="card">
              <div className={`inline-flex p-2 rounded-lg ${card.color} mb-2`}>
                <card.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-surface-100">{card.value}</p>
              <p className="text-xs text-surface-500">{card.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
