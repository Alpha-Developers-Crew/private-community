import { useState } from 'react';
import { Shield, Save } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function AdminSecurity() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 4) {
      toast.error('Code must be at least 4 characters');
      return;
    }

    setLoading(true);
    try {
      await api.put('/access/code', { code });
      toast.success('Access code updated');
      setCode('');
    } catch {
      toast.error('Failed to update code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 max-w-md">
      <h1 className="text-xl font-bold text-surface-100 mb-4">Security Settings</h1>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-medium text-surface-200">Global Access Code</h3>
            <p className="text-xs text-surface-500">Change the code required to enter the platform</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">New Access Code</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              className="input-field"
              placeholder="Enter new code"
              minLength={4}
            />
          </div>
          <button type="submit" disabled={loading || !code} className="btn-primary w-full flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> {loading ? 'Updating...' : 'Update Code'}
          </button>
        </form>

        <p className="text-xs text-surface-500 mt-3">
          Note: Existing logged-in users will not be affected. New visitors must use the new code.
        </p>
      </div>
    </div>
  );
}
