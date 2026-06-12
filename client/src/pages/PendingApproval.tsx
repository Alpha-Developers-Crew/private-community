import { Clock, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function PendingApproval() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/gatekeeper');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface-900 via-surface-950 to-black p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
          <Clock className="w-10 h-10 text-amber-400" />
        </div>

        <h1 className="text-2xl font-bold text-surface-100 mb-2">Waiting for Alpha's Approval</h1>
        <p className="text-surface-400 mb-8">Your account is pending review. An admin will approve your access shortly.</p>

        <div className="card space-y-4 text-left">
          <div className="flex items-center gap-3 p-3 bg-surface-800 rounded-lg">
            <Shield className="w-5 h-5 text-primary-400" />
            <div>
              <p className="text-sm text-surface-300">Signed in as</p>
              <p className="text-surface-100 font-medium">{user?.name || user?.username}</p>
            </div>
          </div>

          <p className="text-xs text-surface-500 text-center">
            You'll be able to access the community once approved.
          </p>

          <button onClick={handleLogout} className="btn-secondary w-full flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
