import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  Shield,
  Megaphone,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sun,
  Moon,
  Crown,
} from 'lucide-react';
import { logout } from '../../store/slices/authSlice';
import { toggleTheme } from '../../store/slices/uiSlice';
import toast from 'react-hot-toast';

const navItems = [
  {
    to: '/super-admin/dashboard',
    icon: LayoutDashboard,
    label: 'Platform Overview',
  },
  { to: '/super-admin/workspaces', icon: Building2, label: 'Workspaces' },
  { to: '/super-admin/users', icon: Users, label: 'All Users' },
  { to: '/super-admin/announcements', icon: Megaphone, label: 'Announcements' },
  { to: '/super-admin/logs', icon: Shield, label: 'Security Logs' },
  { to: '/super-admin/settings', icon: Settings, label: 'Platform Settings' },
];

const SidebarContent = ({
  collapsed,
  mobileOpen,
  user,
  onNavLinkClick,
  onLogout,
}) => (
  <div className="flex flex-col h-full">
    {/* Logo */}
    <div className="flex items-center gap-3 px-4 py-5 border-b border-purple-700/40">
      <div className="flex-shrink-0 w-9 h-9 bg-purple-500 rounded-lg flex items-center justify-center">
        <Crown className="w-5 h-5 text-white" />
      </div>
      {(!collapsed || mobileOpen) && (
        <div>
          <p className="text-sm font-bold text-white leading-tight">
            Super Admin
          </p>
          <p className="text-xs text-purple-300">Platform Control</p>
        </div>
      )}
    </div>

    {/* Navigation */}
    <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavLinkClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
              isActive
                ? 'bg-purple-600 text-white'
                : 'text-purple-200 hover:bg-purple-700/50 hover:text-white'
            }`
          }
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          {(!collapsed || mobileOpen) && (
            <span className="text-sm font-medium">{label}</span>
          )}
        </NavLink>
      ))}
    </nav>

    {/* Footer */}
    <div className="border-t border-purple-700/40 p-4 space-y-2">
      {(!collapsed || mobileOpen) && (
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-purple-300 truncate">{user?.email}</p>
          </div>
        </div>
      )}
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-purple-200 hover:bg-red-600/30 hover:text-red-300 transition-all"
      >
        <LogOut className="w-4 h-4 flex-shrink-0" />
        {(!collapsed || mobileOpen) && (
          <span className="text-sm">Sign Out</span>
        )}
      </button>
    </div>
  </div>
);

export const SuperAdminLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const theme = useSelector((state) => state.ui.theme);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-purple-900 to-purple-950 z-50 lg:hidden"
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 rounded text-purple-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent
              collapsed={collapsed}
              mobileOpen={mobileOpen}
              user={user}
              onNavLinkClick={() => setMobileOpen(false)}
              onLogout={handleLogout}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.div
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.2 }}
        className="hidden lg:flex flex-col flex-shrink-0 bg-gradient-to-b from-purple-900 to-purple-950 overflow-hidden relative"
      >
        <SidebarContent
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          user={user}
          onNavLinkClick={() => {}}
          onLogout={handleLogout}
        />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute bottom-20 -right-3 w-6 h-6 bg-purple-700 rounded-full border border-purple-600 flex items-center justify-center text-white hover:bg-purple-600 transition-colors lg:flex"
          style={{ position: 'absolute', right: '-12px', bottom: '80px' }}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between h-14 px-4 lg:px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {collapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                Super Admin Console
              </span>
            </div>
          </div>
          <button
            onClick={() => dispatch(toggleTheme())}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
