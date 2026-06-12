import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, Upload, Search, X, Download, Film, FileIcon } from 'lucide-react';
import api from '../lib/api';
import { Memory } from '../types';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Memories() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<Memory | null>(null);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '' });
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['memories', search],
    queryFn: () => api.get('/memories', { params: { search: search || undefined } }).then(r => r.data.memories),
  });

  const memories: Memory[] = data || [];

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadForm.title) {
      toast.error('Title and file are required');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await api.post('/memories', {
        title: uploadForm.title,
        description: uploadForm.description,
        file_url: uploadRes.data.url,
        file_type: uploadRes.data.file_type,
        file_size: uploadRes.data.file_size,
      });

      toast.success('Memory saved!');
      setUploadOpen(false);
      setUploadForm({ title: '', description: '' });
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['memories'] });
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getIcon = (type: string) => {
    if (type.startsWith('image')) return <ImageIcon className="w-8 h-8" />;
    if (type.startsWith('video')) return <Film className="w-8 h-8" />;
    return <FileIcon className="w-8 h-8" />;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-surface-800 bg-surface-900/50">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-surface-100">Our Memories</h1>
          <button onClick={() => setUploadOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Upload className="w-4 h-4" /> Upload
          </button>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search memories..."
            className="input-field pl-10"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-surface-500">Loading...</p>
          </div>
        ) : memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-surface-500">
            <ImageIcon className="w-12 h-12 mb-3" />
            <p>No memories yet. Upload your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {memories.map(memory => (
              <button
                key={memory.id}
                onClick={() => setPreview(memory)}
                className="card-hover group text-left overflow-hidden"
              >
                <div className="aspect-square bg-surface-800 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
                  {memory.file_type?.startsWith('image') ? (
                    <img src={memory.file_url} alt={memory.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="text-surface-500">{getIcon(memory.file_type)}</div>
                  )}
                </div>
                <p className="text-sm font-medium text-surface-200 truncate">{memory.title}</p>
                <p className="text-xs text-surface-500 truncate">{memory.uploader_name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Memory">
        <form onSubmit={handleUpload} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Title</label>
            <input type="text" value={uploadForm.title} onChange={e => setUploadForm(p => ({ ...p, title: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Description</label>
            <textarea value={uploadForm.description} onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))} className="input-field" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">File</label>
            <input type="file" accept="image/*,.pdf,.zip,.mp4" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="input-field" required />
            {selectedFile && <p className="text-xs text-surface-400 mt-1">{selectedFile.name}</p>}
          </div>
          <button type="submit" disabled={uploading} className="btn-primary w-full">
            {uploading ? 'Uploading...' : 'Save Memory'}
          </button>
        </form>
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.title || ''}>
        {preview && (
          <div className="space-y-3">
            {preview.file_type?.startsWith('image') ? (
              <img src={preview.file_url} alt={preview.title} className="w-full rounded-lg" />
            ) : preview.file_type?.startsWith('video') ? (
              <video controls className="w-full rounded-lg"><source src={preview.file_url} /></video>
            ) : (
              <a href={preview.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-surface-800 rounded-lg">
                <FileIcon className="w-5 h-5 text-primary-400" /> Download File
              </a>
            )}
            {preview.description && <p className="text-sm text-surface-300">{preview.description}</p>}
            <div className="flex items-center justify-between text-xs text-surface-500">
              <span>Uploaded by {preview.uploader_name}</span>
              <span>{format(new Date(preview.created_at), 'MMM d, yyyy')}</span>
            </div>
            <a href={preview.file_url} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Download
            </a>
          </div>
        )}
      </Modal>
    </div>
  );
}
