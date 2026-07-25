import { WorkspaceNavLink as NavLink } from '../common/WorkspaceLink';
import { useSelector, useDispatch } from 'react-redux';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  FileText,
  BarChart3,
  Briefcase,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  X,
} from 'lucide-react';
import WorkspaceSwitcher from '../common/WorkspaceSwitcher';
import { toggleSidebar } from '../../store/slices/uiSlice';

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/profile', icon: UserCircle, label: 'My Profile' },
  { path: '/clients', icon: Users, label: 'Clients' },
  { path: '/employees', icon: Briefcase, label: 'Employees' },
  { path: '/projects', icon: FolderKanban, label: 'Projects' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/invoices', icon: FileText, label: 'Invoices' },
  { path: '/team', icon: Users, label: 'Team' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export const Sidebar = () => {
  const dispatch = useDispatch();
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);

  const handleNavClick = () => {
    if (sidebarOpen && window.innerWidth < 1024) {
      dispatch(toggleSidebar());
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => dispatch(toggleSidebar())}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed top-0 left-0 h-full w-[280px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50',
          'flex flex-col transition-all duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
          !sidebarOpen && 'lg:w-20'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          {sidebarOpen && (
            <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
              SaaS CRM
            </h1>
          )}
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <WorkspaceSwitcher />
        </div>
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <ul className="space-y-1">
            {menuItems.map(({ path, icon: Icon, label }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      'hover:bg-gray-100 dark:hover:bg-gray-700',
                      isActive
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300'
                    )
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span>{label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Collapse button */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 hidden lg:block">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
