/**
 * SidebarMenu.tsx
 *
 * Slide-out sidebar navigation menu with Redux state management.
 * Opens on mouse hover near left edge, closes on click outside or when the
 * mouse leaves the window.
 * Features smooth animations and keyboard accessibility.
 */

import { useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Home, Info, Keyboard } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store';
import { openSidebar, closeSidebar } from '@/store/slices/sidebarSlice';
import { Logger } from '@/utils/logging';
import { AppLogo } from './AppLogo';

interface MenuItem {
  name: string;
  href: string;
  icon: React.ElementType;
  description?: string;
}

const menuItems: MenuItem[] = [
  { name: 'Home', href: '/', icon: Home, description: 'Convert a sketch to a diagram' },
  { name: 'About', href: '/about', icon: Info, description: 'About Sketcher' },
];

// Edge detection zone width in pixels
const EDGE_TRIGGER_ZONE = 20;

export function SidebarMenu() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(state => state.sidebar.isOpen);
  const location = useLocation();

  // Log sidebar state changes
  useEffect(() => {
    Logger.info(Logger.Categories.UI, `Sidebar ${isOpen ? 'opened' : 'closed'}`);
  }, [isOpen]);

  const handleOpen = useCallback(() => {
    Logger.debug(Logger.Categories.UI, 'Sidebar open requested (edge hover)');
    dispatch(openSidebar());
  }, [dispatch]);

  const handleClose = useCallback(() => {
    Logger.debug(Logger.Categories.UI, 'Sidebar close requested');
    dispatch(closeSidebar());
  }, [dispatch]);

  // Open sidebar when mouse moves to left edge of window
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Only trigger if sidebar is closed and mouse is near left edge
      if (!isOpen && e.clientX <= EDGE_TRIGGER_ZONE) {
        handleOpen();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isOpen, handleOpen]);

  // Close sidebar when the mouse leaves the window, so brushing past the
  // left edge on the way to another screen does not leave it open
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseOut = (e: MouseEvent) => {
      // relatedTarget is null when the pointer leaves the document; the
      // bounds check excludes moves into an iframe, which also report null
      const outside = e.clientX <= 0 || e.clientY <= 0
        || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight;
      if (!e.relatedTarget && outside) {
        handleClose();
      }
    };

    document.addEventListener('mouseout', handleMouseOut);
    return () => document.removeEventListener('mouseout', handleMouseOut);
  }, [isOpen, handleClose]);

  // Close sidebar on route change
  useEffect(() => {
    if (isOpen) {
      handleClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <div
        className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-primary-800 shadow-xl z-50 transform transition-transform duration-300 ease-out"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-primary-700">
          <div className="flex items-center gap-3">
            <AppLogo />
            <span className="text-lg font-semibold text-primary-900 dark:text-white">
              Menu
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-primary-700 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group ${
                  isActive
                    ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-primary-700'
                }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 ${
                    isActive
                      ? 'text-accent-600 dark:text-accent-400'
                      : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200'
                  }`}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{item.name}</span>
                  {item.description && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {item.description}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-primary-700 bg-gray-50 dark:bg-primary-900">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Keyboard className="w-4 h-4" />
            <span>Press ESC to close</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default SidebarMenu;
