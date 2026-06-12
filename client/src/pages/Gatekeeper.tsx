import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Gatekeeper() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { verifyAccess } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const granted = await verifyAccess(code);
      if (granted) {
        toast.success('Access granted');
        navigate('/login');
      } else {
        setError('Invalid access code');
      }
    } catch {
      setError('Invalid access code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface-900 via-surface-950 to-black p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600/10 border border-primary-500/20 mb-4">
            <Shield className="w-8 h-8 text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100">Private Community</h1>
          <p className="text-surface-400 mt-1 text-sm">Enter access code to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(''); }}
              placeholder="Enter Access Code"
              className="input-field pl-10 text-center text-lg tracking-widest uppercase"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button type="submit" disabled={!code || loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? 'Verifying...' : (
              <>Continue <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-xs text-surface-600">Private Community &copy; 2026</p>
      </div>
    </div>
  );
}
