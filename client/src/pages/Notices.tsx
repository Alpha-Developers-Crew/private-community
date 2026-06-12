import { useQuery } from '@tanstack/react-query';
import { Bell, Clock, FileIcon } from 'lucide-react';
import api from '../lib/api';
import { Notice } from '../types';
import { format } from 'date-fns';
import FilePreview from '../components/ui/FilePreview';

export default function Notices() {
  const { data, isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: () => api.get('/notices').then(r => r.data.notices),
    refetchInterval: 60000,
  });

  const notices: Notice[] = data || [];

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-surface-800 bg-surface-900/50">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-primary-400" />
          <h1 className="text-xl font-bold text-surface-100">Notice Board</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-surface-500">Loading...</p>
          </div>
        ) : notices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-surface-500">
            <Bell className="w-12 h-12 mb-3" />
            <p>No notices yet</p>
          </div>
        ) : (
          notices.map(notice => (
            <div key={notice.id} className="card border-l-4 border-l-primary-500">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-surface-100">{notice.title}</h3>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {notice.created_by_name} &middot; {format(new Date(notice.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                  <Clock className="w-3 h-3" />
                  {notice.days_remaining}d remaining
                </div>
              </div>
              {notice.message && (
                <p className="text-sm text-surface-300 whitespace-pre-wrap mb-3">{notice.message}</p>
              )}
              {notice.attachment_url && (
                <FilePreview url={notice.attachment_url} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
