import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Signup() {
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await signup(form.name, form.username, form.email, form.password);
      toast.success('Registration successful! Waiting for admin approval.');
      navigate('/pending');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface-900 via-surface-950 to-black p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600/10 border border-primary-500/20 mb-4">
            <UserPlus className="w-8 h-8 text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100">Join Us</h1>
          <p className="text-surface-400 mt-1 text-sm">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-3">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Name</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} className="input-field" placeholder="Your name" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Username</label>
            <input type="text" name="username" value={form.username} onChange={handleChange} className="input-field" placeholder="Choose a username" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} className="input-field" placeholder="your@email.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Password</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} className="input-field" placeholder="Min 6 characters" required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Confirm Password</label>
            <input type="password" name="confirm" value={form.confirm} onChange={handleChange} className="input-field" placeholder="Confirm password" required />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-surface-400">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
