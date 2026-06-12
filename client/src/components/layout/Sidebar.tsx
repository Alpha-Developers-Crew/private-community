import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  MessageSquare, Image, Bell, Search, User, Settings,
  LayoutDashboard, Users, Shield, Hash, LogOut, Menu, X,
  Sun, Moon, ChevronDown, MessageCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import api from '../../lib/api';
import Avatar from '../ui/Avatar';
import { User as UserType } from '../../types';

const navItems = [
  { to: '/chat', icon: MessageSquare, label: 'Chat', badge: 'chat' as const },
  { to: '/dm', icon: MessageCircle, label: 'DMs', badge: 'dm' as const },
  { to: '/memories', icon: Image, label: 'Memories' },
  { to: '/notices', icon: Bell, label: 'Notices' },
  { to: '/search', icon: Search, label: 'Search' },
];

const adminItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/security', icon: Shield, label: 'Security' },
  { to: '/admin/channels', icon: Hash, label: 'Channels' },
  { to: '/admin/content', icon: Settings, label: 'Content' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadChat, unreadDMs, clearChatNotifications } = useNotifications();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const { data: membersData } = useQuery({
    queryKey: ['sidebar-members'],
    queryFn: () => api.get('/users').then(r => r.data.users),
    refetchInterval: 30000,
  });

  const members: UserType[] = membersData || [];
  const otherMembers = members.filter(m => m.id !== user?.id);

  const handleLogout = async () => {
    await logout();
    navigate('/gatekeeper');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-primary-600/15 text-primary-400 border border-primary-500/20'
        : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-surface-800">
        <h2 className="text-lg font-bold text-surface-100">Community</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider px-3 mb-2">Main</p>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={linkClass}
            onClick={() => {
              setMobileOpen(false);
              if (item.badge === 'chat') clearChatNotifications();
            }}
          >
            <div className="relative">
              <item.icon className="w-4 h-4" />
              {(item.badge === 'chat' && unreadChat) || (item.badge === 'dm' && unreadDMs.length > 0) ? (
                <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full" />
              ) : null}
            </div>
            {item.label}
          </NavLink>
        ))}

        <div className="pt-4 pb-2">
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="flex items-center justify-between w-full px-3 text-xs font-semibold text-surface-500 uppercase tracking-wider hover:text-surface-300 transition-colors"
          >
            <span>Members ({otherMembers.length})</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showMembers ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showMembers && (
          <div className="space-y-0.5">
            {otherMembers.slice(0, 15).map(member => (
              <button
                key={member.id}
                onClick={() => {
                  navigate(`/profile/${member.id}`);
                  setMobileOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors group"
              >
                <Avatar src={member.avatar_url} name={member.name} size="sm" status={member.status} />
                <span className="truncate flex-1 text-left">{member.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/dm/${member.id}`);
                    setMobileOpen(false);
                  }}
                  className="p-1 hover:bg-surface-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
              </button>
            ))}
            {otherMembers.length > 15 && (
              <button
                onClick={() => { navigate('/search'); setMobileOpen(false); }}
                className="text-xs text-primary-400 hover:text-primary-300 px-3 py-1"
              >
                View all members...
              </button>
            )}
          </div>
        )}

        {user?.is_admin && (
          <>
            <div className="pt-4 pb-2">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider px-3">Admin</p>
            </div>
            {adminItems.map(item => (
              <NavLink key={item.to} to={item.to} end={item.to === '/admin'} className={linkClass} onClick={() => setMobileOpen(false)}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </div>

      <div className="p-3 border-t border-surface-800">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <Avatar src={user?.avatar_url} name={user?.name || 'U'} size="sm" status={user?.status} />
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-surface-200 truncate">{user?.name}</p>
              <p className="text-xs text-surface-500 truncate">@{user?.username}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-surface-400" />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface-800 border border-surface-700 rounded-lg p-1 z-20 shadow-xl">
                <button
                  onClick={() => { navigate(`/profile/${user?.id}`); setShowUserMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded text-sm text-surface-300 hover:bg-surface-700 hover:text-surface-100 transition-colors"
                >
                  <User className="w-4 h-4" /> Profile
                </button>
                <button
                  onClick={() => { toggleTheme(); setShowUserMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded text-sm text-surface-300 hover:bg-surface-700 hover:text-surface-100 transition-colors"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
                <div className="border-t border-surface-700 my-1" />
                <button
                  onClick={() => { handleLogout(); setShowUserMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-surface-900 border border-surface-700 rounded-lg"
      >
        <Menu className="w-5 h-5 text-surface-300" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-surface-950 border-r border-surface-800">
            <div className="flex justify-end p-2">
              <button onClick={() => setMobileOpen(false)} className="p-2 hover:bg-surface-800 rounded-lg">
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      <aside className="hidden lg:flex flex-col w-64 bg-surface-950 border-r border-surface-800 h-screen shrink-0">
        {sidebarContent}
      </aside>
    </>
  );
}
