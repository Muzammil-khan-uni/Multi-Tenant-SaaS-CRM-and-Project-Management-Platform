import { useSelector, useDispatch } from 'react-redux';
import { WorkspaceLink as Link } from '../common/WorkspaceLink';
import { useWorkspaceNavigate as useNavigate } from '../../hooks/useWorkspaceNavigate';
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Search,
  User,
  LogOut,
  Settings,
  X,
  Loader2,
  Users,
  Building2,
  Briefcase,
  FolderKanban,
  CheckSquare,
  FileText,
} from 'lucide-react';
import { toggleSidebar, toggleTheme } from '../../store/slices/uiSlice';
import { useAuth } from '../../hooks/useAuth';
import RealTimeNotifications from '../common/RealTimeNotifications';
import axios from '../../api/axios';
import { useState, useRef, useEffect } from 'react';

export const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const theme = useSelector((state) => state.ui.theme);
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);
  const searchDebounceRef = useRef(null);

  useEffect(() => {
    const term = searchQuery.trim();
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!term) {
      return undefined;
    }

    searchDebounceRef.current = setTimeout(async () => {
      const params = { search: term, limit: 5 };
      const [members, clients, employees, projects, tasks, invoices] =
        await Promise.allSettled([
          axios.get('/workspaces/members', { params: { search: term } }),
          axios.get('/clients', { params }),
          axios.get('/employees', { params }),
          axios.get('/projects', { params }),
          axios.get('/tasks', { params }),
          axios.get('/invoices', { params }),
        ]);

      const extract = (result) =>
        result.status === 'fulfilled' ? result.value.data?.data || [] : [];

      setSearchResults({
        members: extract(members).slice(0, 5),
        clients: extract(clients),
        employees: extract(employees),
        projects: extract(projects),
        tasks: extract(tasks),
        invoices: extract(invoices),
      });
      setSearching(false);
    }, 350);

    return () => clearTimeout(searchDebounceRef.current);
  }, [searchQuery]);

  const searchCategories = searchResults
    ? [
        {
          key: 'members',
          label: 'Members',
          icon: Users,
          items: searchResults.members,
          getPath: () => '/team',
          getTitle: (m) =>
            `${m.firstName || ''} ${m.lastName || ''}`.trim() ||
            'Unnamed Member',
          getSubtitle: (m) => m.email,
        },
        {
          key: 'clients',
          label: 'Clients',
          icon: Building2,
          items: searchResults.clients,
          getPath: (c) => `/clients/${c._id}`,
          getTitle: (c) => c.company?.name || 'Untitled Client',
          getSubtitle: (c) => c.contacts?.[0]?.email || c.company?.industry,
        },
        {
          key: 'employees',
          label: 'Employees',
          icon: Briefcase,
          items: searchResults.employees,
          getPath: (e) => `/employees/${e._id}`,
          getTitle: (e) =>
            `${e.user?.firstName || ''} ${e.user?.lastName || ''}`.trim() ||
            'Unnamed Employee',
          getSubtitle: (e) => e.employeeId || e.user?.email,
        },
        {
          key: 'projects',
          label: 'Projects',
          icon: FolderKanban,
          items: searchResults.projects,
          getPath: (p) => `/projects/${p._id}`,
          getTitle: (p) => p.name || 'Untitled Project',
          getSubtitle: (p) => p.client?.company?.name,
        },
        {
          key: 'tasks',
          label: 'Tasks',
          icon: CheckSquare,
          items: searchResults.tasks,
          getPath: (t) => `/tasks/${t._id}`,
          getTitle: (t) => t.title || 'Untitled Task',
          getSubtitle: (t) => t.project?.name,
        },
        {
          key: 'invoices',
          label: 'Invoices',
          icon: FileText,
          items: searchResults.invoices,
          getPath: (i) => `/invoices/${i._id}`,
          getTitle: (i) => i.number || 'Untitled Invoice',
          getSubtitle: (i) => i.client?.company?.name,
        },
      ]
    : [];

  const hasAnyResults = searchCategories.some((cat) => cat.items.length > 0);

  const handleSelectSearchResult = (path) => {
    setSearchQuery('');
    setSearchResults(null);
    setShowSearchResults(false);
    navigate(path);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setShowSearchResults(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
          <div
            className="hidden sm:block relative w-64 lg:w-72"
            ref={searchRef}
          >
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                  setShowSearchResults(true);
                  if (!value.trim()) {
                    setSearchResults(null);
                    setSearching(false);
                  } else {
                    setSearching(true);
                  }
                }}
                onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
                onKeyDown={(e) => e.key === 'Escape' && clearSearch()}
                placeholder="Search members, clients, projects..."
                className="bg-transparent border-none outline-none text-sm w-full min-w-0"
              />
              {searching && (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />
              )}
              {searchQuery && !searching && (
                <button onClick={clearSearch} className="flex-shrink-0">
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {showSearchResults && searchQuery.trim() && (
              <div className="absolute left-0 top-full mt-2 w-full sm:w-96 max-h-[70vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                {searching && !searchResults ? (
                  <div className="p-4 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching...
                  </div>
                ) : !hasAnyResults ? (
                  <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                    No results found for "{searchQuery.trim()}"
                  </div>
                ) : (
                  searchCategories.map(
                    (cat) =>
                      cat.items.length > 0 && (
                        <div
                          key={cat.key}
                          className="py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          <p className="px-3 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                            {cat.label}
                          </p>
                          {cat.items.map((item) => (
                            <button
                              key={item._id}
                              onClick={() =>
                                handleSelectSearchResult(cat.getPath(item))
                              }
                              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <cat.icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {cat.getTitle(item)}
                                </p>
                                {cat.getSubtitle(item) && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {cat.getSubtitle(item)}
                                  </p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={() => dispatch(toggleTheme())}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </button>

          <RealTimeNotifications />

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </span>
              </div>
              <span className="hidden md:block text-sm font-medium">
                {user?.firstName} {user?.lastName}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setShowUserMenu(false)}
                >
                  <User className="w-4 h-4" />
                  My Profile
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 w-full"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
