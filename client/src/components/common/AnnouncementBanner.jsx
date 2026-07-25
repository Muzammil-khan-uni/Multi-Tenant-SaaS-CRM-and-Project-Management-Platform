import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Info,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Pin,
  ChevronDown,
  ChevronUp,
  Megaphone,
} from 'lucide-react';
import { useAnnouncements } from '../../hooks/useAnnouncements';

const TYPE_CONFIG = {
  info: {
    gradient:
      'from-blue-50 via-blue-50/50 to-transparent dark:from-blue-950/60 dark:via-blue-950/20 dark:to-transparent',
    border: 'border-blue-100 dark:border-blue-900/60',
    accent: 'bg-blue-500',
    iconWrap:
      'bg-blue-100 dark:bg-blue-900/80 ring-1 ring-blue-200/80 dark:ring-blue-700/60',
    icon: Info,
    iconColor: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-950 dark:text-white',
    body: 'text-blue-700/75 dark:text-blue-300/75',
    pin: 'bg-blue-100 dark:bg-blue-900/80 text-blue-600 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-700',
    dismiss:
      'text-blue-400 hover:text-blue-700 dark:hover:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900/60',
    footer:
      'text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-100',
    countBadge: 'bg-blue-500 text-white',
  },
  warning: {
    gradient:
      'from-amber-50 via-amber-50/50 to-transparent dark:from-amber-950/60 dark:via-amber-950/20 dark:to-transparent',
    border: 'border-amber-100 dark:border-amber-900/60',
    accent: 'bg-amber-500',
    iconWrap:
      'bg-amber-100 dark:bg-amber-900/80 ring-1 ring-amber-200/80 dark:ring-amber-700/60',
    icon: AlertTriangle,
    iconColor: 'text-amber-600 dark:text-amber-400',
    title: 'text-amber-950 dark:text-white',
    body: 'text-amber-700/75 dark:text-amber-300/75',
    pin: 'bg-amber-100 dark:bg-amber-900/80 text-amber-600 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-700',
    dismiss:
      'text-amber-400 hover:text-amber-700 dark:hover:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/60',
    footer:
      'text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-100',
    countBadge: 'bg-amber-500 text-white',
  },
  success: {
    gradient:
      'from-emerald-50 via-emerald-50/50 to-transparent dark:from-emerald-950/60 dark:via-emerald-950/20 dark:to-transparent',
    border: 'border-emerald-100 dark:border-emerald-900/60',
    accent: 'bg-emerald-500',
    iconWrap:
      'bg-emerald-100 dark:bg-emerald-900/80 ring-1 ring-emerald-200/80 dark:ring-emerald-700/60',
    icon: CheckCircle,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    title: 'text-emerald-950 dark:text-white',
    body: 'text-emerald-700/75 dark:text-emerald-300/75',
    pin: 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-700',
    dismiss:
      'text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-900/60',
    footer:
      'text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-100',
    countBadge: 'bg-emerald-500 text-white',
  },
  danger: {
    gradient:
      'from-red-50 via-red-50/50 to-transparent dark:from-red-950/60 dark:via-red-950/20 dark:to-transparent',
    border: 'border-red-100 dark:border-red-900/60',
    accent: 'bg-red-500',
    iconWrap:
      'bg-red-100 dark:bg-red-900/80 ring-1 ring-red-200/80 dark:ring-red-700/60',
    icon: AlertCircle,
    iconColor: 'text-red-600 dark:text-red-400',
    title: 'text-red-950 dark:text-white',
    body: 'text-red-700/75 dark:text-red-300/75',
    pin: 'bg-red-100 dark:bg-red-900/80 text-red-600 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-700',
    dismiss:
      'text-red-400 hover:text-red-700 dark:hover:text-red-100 hover:bg-red-100 dark:hover:bg-red-900/60',
    footer:
      'text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-100',
    countBadge: 'bg-red-500 text-white',
  },
};

const timeAgo = (iso) => {
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const AnnouncementItem = ({ a, onDismiss }) => {
  const cfg = TYPE_CONFIG[a.type] || TYPE_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      className={`relative flex items-start gap-3 px-5 py-3 bg-gradient-to-r ${cfg.gradient} border-b ${cfg.border}`}
    >
      {/* 3 px left accent stripe */}
      <div
        className={`absolute left-0 inset-y-0 w-[3px] rounded-r-full ${cfg.accent}`}
      />

      {/* Rounded icon badge */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ml-1 ${cfg.iconWrap}`}
      >
        <Icon className={`w-[17px] h-[17px] ${cfg.iconColor}`} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 py-px">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold leading-snug ${cfg.title}`}>
            {a.title}
          </span>

          {a.isPinned && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-px rounded-full text-[10px] font-semibold tracking-wide uppercase ${cfg.pin}`}
            >
              <Pin className="w-2.5 h-2.5" />
              Pinned
            </span>
          )}

          <span className={`text-[11px] ml-auto tabular-nums ${cfg.body}`}>
            {timeAgo(a.createdAt)}
          </span>
        </div>

        <p className={`text-[13px] mt-0.5 leading-relaxed ${cfg.body}`}>
          {a.message}
        </p>
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(a._id)}
        aria-label="Dismiss"
        className={`flex-shrink-0 p-1.5 rounded-lg transition-all duration-150 ${cfg.dismiss}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};

const AnnouncementBanner = () => {
  const { announcements, dismiss } = useAnnouncements();
  const [expanded, setExpanded] = useState(false);

  if (!announcements.length) return null;

  const [primary, ...rest] = announcements;
  const cfg = TYPE_CONFIG[primary.type] || TYPE_CONFIG.info;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="w-full overflow-hidden"
    >
      {/* ── Header label strip ─────────────────────────────────────────────── */}
      <div
        className={`flex items-center gap-2.5 px-5 py-1.5 bg-gradient-to-r ${cfg.gradient} border-b ${cfg.border}`}
      >
        {/* Icon badge */}
        <div
          className={`flex items-center justify-center w-5 h-5 rounded-md ${cfg.iconWrap}`}
        >
          <Megaphone className={`w-3 h-3 ${cfg.iconColor}`} />
        </div>
        {/* Label */}
        <span
          className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${cfg.body}`}
        >
          Platform Announcements
        </span>
        {/* Count badge */}
        <span
          className={`ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold tabular-nums ${cfg.countBadge}`}
        >
          {announcements.length}
        </span>
      </div>
      <AnimatePresence mode="popLayout">
        {/* Always-visible primary announcement */}
        <AnnouncementItem key={primary._id} a={primary} onDismiss={dismiss} />

        {/* Expanded extras */}
        {expanded &&
          rest.map((a) => (
            <AnnouncementItem key={a._id} a={a} onDismiss={dismiss} />
          ))}
      </AnimatePresence>

      {/* Footer — only when extras exist */}
      {rest.length > 0 && (
        <motion.div
          layout
          className={`flex items-center justify-between px-5 py-1.5 bg-gradient-to-r ${cfg.gradient} border-b ${cfg.border}`}
        >
          <button
            onClick={() => setExpanded((v) => !v)}
            className={`flex items-center gap-1.5 text-[12px] font-medium transition-colors ${cfg.footer}`}
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span
                  className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-[10px] font-bold ${cfg.countBadge}`}
                >
                  {rest.length}
                </span>
                more announcement{rest.length !== 1 ? 's' : ''}
              </>
            )}
          </button>

          <button
            onClick={() => announcements.forEach((a) => dismiss(a._id))}
            className={`text-[12px] font-medium transition-colors ${cfg.footer}`}
          >
            Dismiss all
          </button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AnnouncementBanner;
