import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Loading from './components/ui/Loading';
import Gatekeeper from './pages/Gatekeeper';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PendingApproval from './pages/PendingApproval';
import DashboardLayout from './components/layout/DashboardLayout';
import Chat from './pages/Chat';
import DM from './pages/DM';
import Memories from './pages/Memories';
import Notices from './pages/Notices';
import Profile from './pages/Profile';
import Search from './pages/Search';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSecurity from './pages/admin/AdminSecurity';
import AdminChannels from './pages/admin/AdminChannels';
import AdminContent from './pages/admin/AdminContent';

function ProtectedRoute({ children, requireAdmin }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" />;
  if (!user.is_approved) return <Navigate to="/pending" />;
  if (requireAdmin && !user.is_admin) return <Navigate to="/" />;

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requireAdmin>{children}</ProtectedRoute>;
}

export default function App() {
  const { user, loading, accessGranted } = useAuth();

  if (loading) return <Loading />;

  return (
    <Routes>
      <Route path="/gatekeeper" element={accessGranted ? <Navigate to={user ? (user.is_approved ? '/' : '/pending') : '/login'} /> : <Gatekeeper />} />
      <Route path="/login" element={user ? (user.is_approved ? <Navigate to="/" /> : <Navigate to="/pending" />) : accessGranted ? <Login /> : <Navigate to="/gatekeeper" />} />
      <Route path="/signup" element={user ? (user.is_approved ? <Navigate to="/" /> : <Navigate to="/pending" />) : accessGranted ? <Signup /> : <Navigate to="/gatekeeper" />} />
      <Route path="/pending" element={!user ? <Navigate to="/login" /> : user.is_approved ? <Navigate to="/" /> : <PendingApproval />} />

      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Chat />} />
        <Route path="chat" element={<Chat />} />
        <Route path="chat/:channelId" element={<Chat />} />
        <Route path="dm" element={<DM />} />
        <Route path="dm/:userId" element={<DM />} />
        <Route path="memories" element={<Memories />} />
        <Route path="notices" element={<Notices />} />
        <Route path="profile/:userId" element={<Profile />} />
        <Route path="search" element={<Search />} />
      </Route>

      <Route path="/admin" element={<AdminRoute><DashboardLayout /></AdminRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="security" element={<AdminSecurity />} />
        <Route path="channels" element={<AdminChannels />} />
        <Route path="content" element={<AdminContent />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
