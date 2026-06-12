import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Calendar, MessageCircle, Save } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/ui/Avatar';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Profile() {
  const { userId } = useParams();
  const { user: currentUser, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => api.get(`/users/${userId}/profile`).then(r => r.data.profile),
    enabled: !!userId,
  });

  const profile = data;
  const isOwn = currentUser?.id === userId;

  const startEdit = () => {
    if (profile) {
      setEditForm({ name: profile.name, bio: profile.bio || '' });
      setEditing(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/profile', editForm);
      toast.success('Profile updated');
      setEditing(false);
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await api.put('/users/profile', { avatar_url: res.data.url });
      toast.success('Avatar updated');
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    } catch {
      toast.error('Avatar upload failed');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><p className="text-surface-500">Loading...</p></div>;
  }

  if (!profile) {
    return <div className="flex items-center justify-center h-full"><p className="text-surface-500">User not found</p></div>;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="card text-center">
          <div className="relative inline-block">
            <Avatar src={profile.avatar_url} name={profile.name} size="xl" status={profile.status} />
            {isOwn && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 bg-surface-800 rounded-full border-2 border-surface-900 hover:bg-surface-700 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-surface-300" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </>
            )}
          </div>

          {editing ? (
            <div className="mt-4 space-y-3">
              <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="input-field text-center" />
              <textarea value={editForm.bio} onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))} className="input-field text-center" rows={3} placeholder="Bio..." />
              <div className="flex gap-2 justify-center">
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <h1 className="text-xl font-bold text-surface-100">{profile.name}</h1>
              <p className="text-sm text-surface-400">@{profile.username}</p>
              {profile.bio && <p className="text-sm text-surface-300 mt-2">{profile.bio}</p>}
              <div className="flex items-center justify-center gap-4 mt-3 text-xs text-surface-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined {format(new Date(profile.created_at), 'MMM yyyy')}
                </span>
                <span className={`capitalize ${profile.status === 'online' ? 'text-emerald-400' : profile.status === 'away' ? 'text-amber-400' : 'text-surface-400'}`}>
                  {profile.status}
                </span>
              </div>
              {isOwn && (
                <button onClick={startEdit} className="btn-secondary mt-4 text-sm">Edit Profile</button>
              )}
            </div>
          )}
        </div>

        {!isOwn && currentUser && (
          <a
            href={`/dm/${userId}`}
            className="card-hover flex items-center gap-3 justify-center text-surface-300 hover:text-surface-100"
          >
            <MessageCircle className="w-5 h-5" />
            Send Message
          </a>
        )}
      </div>
    </div>
  );
}
