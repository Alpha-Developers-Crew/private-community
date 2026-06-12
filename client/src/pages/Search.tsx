import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, User, Hash, Bell, Image, MessageSquare } from 'lucide-react';
import api from '../lib/api';
import Avatar from '../components/ui/Avatar';
import { User as UserType, Channel, Notice, Memory } from '../types';
import { format } from 'date-fns';

export default function Search() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const { data: users } = useQuery({
    queryKey: ['search-users', query],
    queryFn: () => api.get('/users').then(r => r.data.users),
    enabled: query.length > 0,
  });

  const { data: memories } = useQuery({
    queryKey: ['search-memories', query],
    queryFn: () => api.get('/memories', { params: { search: query } }).then(r => r.data.memories),
    enabled: query.length > 0,
  });

  const userList: UserType[] = users || [];
  const memoryList: Memory[] = memories || [];

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-surface-800 bg-surface-900/50">
        <div className="relative max-w-xl">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search users, memories..."
            className="input-field pl-10 text-lg"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {query && (
          <>
            <section>
              <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Users ({userList.length})
              </h3>
              <div className="space-y-1">
                {userList.filter(u => u.name.toLowerCase().includes(query.toLowerCase()) || u.username.toLowerCase().includes(query.toLowerCase())).map(u => (
                  <button
                    key={u.id}
                    onClick={() => navigate(`/profile/${u.id}`)}
                    className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-surface-800 transition-colors"
                  >
                    <Avatar src={u.avatar_url} name={u.name} size="md" status={u.status} />
                    <div className="text-left">
                      <p className="text-sm font-medium text-surface-200">{u.name}</p>
                      <p className="text-xs text-surface-500">@{u.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Image className="w-3.5 h-3.5" /> Memories ({memoryList.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {memoryList.map(m => (
                  <div key={m.id} className="card-hover overflow-hidden">
                    {m.file_type?.startsWith('image') ? (
                      <img src={m.file_url} alt={m.title} className="w-full h-24 object-cover rounded mb-2" />
                    ) : (
                      <div className="w-full h-24 bg-surface-800 rounded mb-2 flex items-center justify-center">
                        <Image className="w-6 h-6 text-surface-500" />
                      </div>
                    )}
                    <p className="text-sm font-medium text-surface-200 truncate">{m.title}</p>
                    <p className="text-xs text-surface-500">{m.uploader_name}</p>
                  </div>
                ))}
              </div>
            </section>

            {userList.length === 0 && memoryList.length === 0 && (
              <div className="text-center text-surface-500 py-8">
                <SearchIcon className="w-12 h-12 mx-auto mb-3" />
                <p>No results found for "{query}"</p>
              </div>
            )}
          </>
        )}

        {!query && (
          <div className="flex flex-col items-center justify-center h-full text-surface-500">
            <SearchIcon className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg">Search users and memories</p>
            <p className="text-sm">Type above to search across the community</p>
          </div>
        )}
      </div>
    </div>
  );
}
