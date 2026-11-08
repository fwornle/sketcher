import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { Menu, X, Settings, FileText, Sun, Moon } from 'lucide-react';
import { SettingsModal } from '../settings/SettingsModal';
import { LoggingControl } from '../ui/LoggingControl';
import { AppLogo } from './AppLogo';
import { useAppSelector, useAppDispatch } from '@/store';
import { updatePreferences } from '@/store/slices/preferencesSlice';
import { cn } from '@/lib/utils';

interface TopBarProps {
  className?: string;
  appName?: string;
  navigation?: Array<{ name: string; href: string }>;
}

const iconButtonClass =
  'rounded-full bg-primary-800 dark:bg-primary-900 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-800';

export function TopBar({
  className = '',
  appName = 'Sketcher',
  navigation = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
  ],
}: TopBarProps) {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLoggingControl, setShowLoggingControl] = useState(false);

  const dispatch = useAppDispatch();
  const theme = useAppSelector(state => state.preferences.theme) || 'system';

  // Resolve 'system' to the actually applied theme
  const appliedTheme =
    theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;

  const toggleTheme = () => {
    dispatch(updatePreferences({ theme: appliedTheme === 'dark' ? 'light' : 'dark' }));
  };

  return (
    <>
      <Disclosure as="nav" className={`bg-primary-800 dark:bg-primary-900 ${className}`}>
        {({ open }) => (
          <>
            <div className="mx-auto px-2 sm:px-6 lg:px-8">
              <div className="relative flex h-16 items-center justify-between">
                <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                  {/* Mobile menu button */}
                  <DisclosureButton className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-primary-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <X className="block h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Menu className="block h-5 w-5" aria-hidden="true" />
                    )}
                  </DisclosureButton>
                </div>

                <div className="flex flex-1 items-center justify-start pl-10 sm:pl-0 sm:items-stretch">
                  {/* Logo and Title */}
                  <Link to="/" className="flex flex-shrink-0 items-center">
                    <AppLogo />
                    <h1 className="ml-2 text-xl font-bold text-white hidden sm:block">{appName}</h1>
                  </Link>

                  {/* Desktop Navigation */}
                  <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
                    {navigation.map((item) => (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        end
                        className={({ isActive }) =>
                          cn(
                            'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-primary-700 text-white'
                              : 'text-gray-300 hover:bg-primary-700 hover:text-white',
                          )
                        }
                      >
                        {item.name}
                      </NavLink>
                    ))}
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="absolute inset-y-0 right-0 flex items-center space-x-2 pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                  <button
                    type="button"
                    className={iconButtonClass}
                    onClick={toggleTheme}
                    title={`Current: ${appliedTheme}. Click to toggle.`}
                  >
                    <span className="sr-only">Toggle theme</span>
                    {appliedTheme === 'dark' ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
                  </button>

                  <button
                    type="button"
                    className={iconButtonClass}
                    onClick={() => setShowLoggingControl(true)}
                    title="Logging Configuration"
                  >
                    <span className="sr-only">Open logging configuration</span>
                    <FileText className="h-6 w-6" />
                  </button>

                  <button
                    type="button"
                    className={iconButtonClass}
                    onClick={() => setShowSettingsModal(true)}
                    title="Settings & API keys"
                  >
                    <span className="sr-only">Open settings</span>
                    <Settings className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile menu */}
            <DisclosurePanel className="sm:hidden">
              <div className="space-y-1 px-2 pb-3 pt-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-primary-700"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </DisclosurePanel>
          </>
        )}
      </Disclosure>

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      <LoggingControl
        isOpen={showLoggingControl}
        onClose={() => setShowLoggingControl(false)}
      />
    </>
  );
}

export default TopBar;
