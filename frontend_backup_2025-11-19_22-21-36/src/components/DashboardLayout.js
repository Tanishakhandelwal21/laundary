import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { Button } from '@/components/ui/button';
import { Bell, LogOut, Menu, X, Droplets, User as UserIcon, MapPin } from 'lucide-react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const { user, logout, API } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPickupDialog, setShowPickupDialog] = useState(false);
  const [pickupAddressInput, setPickupAddressInput] = useState('');
  const [savingPickup, setSavingPickup] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const markAsRead = async (notifId) => {
    try {
      // Optimistically update UI
      setNotifications(prev => 
        prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
      );
      await axios.put(`${API}/notifications/${notifId}/read`);
    } catch (error) {
      console.error('Failed to mark notification as read', error);
      // Revert on error
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    try {
      // Optimistically update UI
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      await axios.put(`${API}/notifications/read-all`);
    } catch (error) {
      console.error('Failed to mark all as read', error);
      // Revert on error
      fetchNotifications();
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchCurrentPickupAddress = async () => {
    try {
      const res = await axios.get(`${API}/config/addresses`);
      setPickupAddressInput(res.data.business_pickup_address || '');
    } catch (e) {
      console.error('Failed to fetch pickup address', e);
    }
  };

  const savePickupAddress = async () => {
    if (!pickupAddressInput || pickupAddressInput.trim().length < 5) {
      toast.error('Please enter a valid pickup address (min 5 characters).');
      return;
    }
    try {
      setSavingPickup(true);
      await axios.put(`${API}/config/addresses/pickup`, { business_pickup_address: pickupAddressInput.trim() });
      toast.success('Business pickup address updated');
      setShowPickupDialog(false);
      // Notify pages to refresh their cached address
      window.dispatchEvent(new CustomEvent('businessPickupAddressUpdated'));
    } catch (e) {
      console.error('Failed to update pickup address', e);
      toast.error(e?.response?.data?.detail || 'Failed to update pickup address');
    } finally {
      setSavingPickup(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 fixed w-full z-30">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center min-w-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 hover:text-gray-700 mr-2 sm:mr-4 flex-shrink-0"
                data-testid="toggle-sidebar-btn"
              >
                {sidebarOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                <img 
                  src="/assets/logo.png"
                  alt="Infinite Laundry Solutions Logo"
                  className="h-14 w-auto flex-shrink-0"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotifications(!showNotifications);
                  }}
                  className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                  data-testid="notifications-btn"
                >
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                  {unreadCount > 0 && (
                    <span className="notification-badge text-[10px] sm:text-xs" data-testid="notification-count">{unreadCount}</span>
                  )}
                </button>

                {showNotifications && (
                  <>
                    {/* Click outside overlay to close */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowNotifications(false)}
                    ></div>
                    
                    {/* Notification dropdown */}
                    <div 
                      className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50" 
                      data-testid="notifications-dropdown"
                      onClick={(e) => e.stopPropagation()}
                    >
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAllAsRead();
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50 h-7"
                          data-testid="mark-all-read-btn"
                        >
                          Mark all as read
                        </Button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">No notifications</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!notif.is_read) {
                                markAsRead(notif.id);
                              }
                            }}
                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                              !notif.is_read ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''
                            }`}
                            data-testid={`notification-${notif.id}`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <p className={`font-semibold text-sm ${!notif.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                                {notif.title}
                              </p>
                              {!notif.is_read && (
                                <span className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0 ml-2"></span>
                              )}
                            </div>
                            <p className={`text-sm ${!notif.is_read ? 'text-gray-700' : 'text-gray-500'}`}>
                              {notif.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notif.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  </>
                )}
              </div>

              {/* User Profile */}
              <div className="flex items-center space-x-2 sm:space-x-3 pl-2 sm:pl-4 border-l border-gray-200">
                {['owner','admin'].includes(user?.role) && (
                  <Dialog open={showPickupDialog} onOpenChange={async (open) => {
                    setShowPickupDialog(open);
                    if (open) {
                      await fetchCurrentPickupAddress();
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-gray-700 hover:text-teal-700 hover:border-teal-600 h-8 sm:h-9 px-2 sm:px-3"
                        data-testid="set-pickup-address-btn"
                        title="Set Pickup Address"
                      >
                        <MapPin className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Set Pickup</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Set Business Pickup Address</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div>
                          <Label>Pickup Address</Label>
                          <Input
                            value={pickupAddressInput}
                            onChange={(e) => setPickupAddressInput(e.target.value)}
                            placeholder="Enter business pickup address"
                          />
                          <p className="text-xs text-gray-500 mt-1">This address will be used for all new orders.</p>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button variant="outline" onClick={() => setShowPickupDialog(false)} disabled={savingPickup}>Cancel</Button>
                          <Button onClick={savePickupAddress} disabled={savingPickup} className="bg-teal-500 hover:bg-teal-600">
                            {savingPickup ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                <div className="text-right hidden sm:block">
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate max-w-[100px] md:max-w-none">{user?.full_name}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
                {['customer','driver'].includes(user?.role) && (
                  <Button
                    onClick={() => navigate('/profile')}
                    variant="outline"
                    size="sm"
                    className="text-gray-700 hover:text-teal-700 hover:border-teal-600 h-8 sm:h-9 px-2 sm:px-3"
                    data-testid="profile-btn"
                    title="Profile"
                  >
                    <UserIcon className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="text-gray-700 hover:text-red-600 hover:border-red-600 h-8 sm:h-9 px-2 sm:px-3"
                  data-testid="logout-btn"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-14 sm:pt-16 flex">
        {/* Sidebar - could add navigation items here if needed */}
        {sidebarOpen && (
          <aside className="w-48 sm:w-56 md:w-64 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-14 sm:top-16 z-20 hidden md:block" data-testid="dashboard-sidebar">
            <div className="p-4 sm:p-6">
              <div className="space-y-2">
                <div className="p-3 bg-teal-50 rounded-lg">
                  <p className="text-xs sm:text-sm font-medium text-teal-900">Dashboard</p>
                  <p className="text-[10px] sm:text-xs text-teal-600 mt-1">Welcome to your workspace</p>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className={`flex-1 p-4 sm:p-6 ${sidebarOpen ? 'md:ml-48 lg:ml-56 xl:ml-64' : ''} transition-all`}>
          {children}
          
          {/* Footer */}
          <footer className="mt-8 pt-6 pb-4 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Powered by{' '}
                <a 
                  href="https://aclixgo.aclixinnovations.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:text-teal-700 font-semibold hover:underline"
                >
                  Aclix Innovations
                </a>
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;