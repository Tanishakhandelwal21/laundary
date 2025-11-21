import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { AuthContext } from '../App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

function ProfilePage() {
  const { API, refreshUser, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profile, setProfile] = useState({ full_name: '', email: '', phone: '', address: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/auth/me`);
        setProfile({
          full_name: res.data.full_name || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          address: res.data.address || ''
        });
      } catch (e) {
        console.error('Failed to load profile', e);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [API]);

  // Profile details are read-only for customers/drivers per policy

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.current_password || !passwordForm.new_password) {
      toast.error('Please fill all password fields');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      setChangingPassword(true);
      await axios.put(`${API}/auth/me/password`, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      toast.success('Password changed');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (e) {
      console.error('Failed to change password', e);
      toast.error(e.response?.data?.detail || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );
  }

  if (!['customer','driver'].includes(user?.role)) {
    return (
      <div className="p-6">
        <p className="text-red-600">Profile page is available for customers and drivers only.</p>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Page Header with Back button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/dashboard/${user?.role || 'customer'}`)}
              className="h-9"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
              <p className="text-gray-500">Update your personal details and password</p>
            </div>
          </div>
        </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Profile Details</h2>
        <p className="text-sm text-gray-500 mb-4">Contact admin to update your profile. Details are read-only.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Full Name</Label>
            <Input value={profile.full_name} disabled />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={profile.email} disabled />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={profile.phone} disabled />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={profile.address} disabled />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Current Password</Label>
            <Input type="password" value={passwordForm.current_password} onChange={(e) => setPasswordForm(f => ({ ...f, current_password: e.target.value }))} required />
          </div>
          <div>
            <Label>New Password</Label>
            <Input type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm(f => ({ ...f, new_password: e.target.value }))} required />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input type="password" value={passwordForm.confirm_password} onChange={(e) => setPasswordForm(f => ({ ...f, confirm_password: e.target.value }))} required />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="submit" variant="outline" disabled={changingPassword}>
              {changingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </div>
      </div>
    </DashboardLayout>
  );
}

export default ProfilePage;
