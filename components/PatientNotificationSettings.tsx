/**
 * Patient Notification Settings Page
 * Allows patients to register/refresh their FCM token
 */

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { requestNotificationPermission, validateFCMToken, hasNotificationPermission, refreshFCMToken } from '../services/fcm.service';

interface PatientNotificationSettingsProps {
  patientPhone: string;
  patientName?: string;
}

export default function PatientNotificationSettings({ 
  patientPhone, 
  patientName 
}: PatientNotificationSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<'enabled' | 'disabled' | 'checking'>('checking');
  const [tokenInfo, setTokenInfo] = useState<{ valid: boolean; needsRefresh: boolean; ageInDays?: number } | null>(null);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  // Normalize patient phone to userId
  const getUserId = () => {
    const digits = patientPhone.replace(/\D/g, '');
    const trimmed = digits.replace(/^91/, '');
    const phone10 = trimmed.slice(-10);
    return `patient_${phone10}`;
  };

  const userId = getUserId();

  // Check notification status on mount
  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    setNotificationStatus('checking');
    
    // Check browser permission
    const browserPerm = hasNotificationPermission() ? 'granted' : Notification.permission;
    setBrowserPermission(browserPerm);

    if (browserPerm !== 'granted') {
      setNotificationStatus('disabled');
      return;
    }

    // Validate FCM token
    const validation = await validateFCMToken(userId);
    setTokenInfo(validation);

    if (validation.valid) {
      setNotificationStatus('enabled');
    } else {
      setNotificationStatus('disabled');
    }
  };

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {

      
      const token = await requestNotificationPermission(userId, 'patient');
      
      if (token) {

        toast.success('🔔 Notifications enabled!', {
          description: 'You will now receive appointment reminders and updates.',
          duration: 5000
        });
        await checkNotificationStatus();
      } else {
        console.error('❌ Failed to get token');
        toast.error('Could not enable notifications', {
          description: 'Please check your browser settings and allow notifications for this site.',
          duration: 6000
        });
      }
    } catch (error: any) {
      console.error('❌ Error enabling notifications:', error);
      toast.error('Error enabling notifications', {
        description: error.message || 'An unexpected error occurred',
        duration: 6000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    setLoading(true);
    try {

      
      const newToken = await refreshFCMToken(userId, 'patient');
      
      if (newToken) {

        toast.success('🔄 Notifications refreshed!', {
          description: 'Your notification settings have been updated.',
          duration: 5000
        });
        await checkNotificationStatus();
      } else {
        toast.error('Failed to refresh notifications', {
          description: 'Please try again or contact support.',
          duration: 6000
        });
      }
    } catch (error: any) {
      console.error('❌ Error refreshing token:', error);
      toast.error('Error refreshing notifications', {
        description: error.message || 'An unexpected error occurred',
        duration: 6000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Bell className="w-6 h-6 text-blue-400" />
            Notification Settings
          </CardTitle>
          <CardDescription className="text-gray-400">
            {patientName ? `Manage notifications for ${patientName}` : 'Manage your appointment notifications'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Display */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {notificationStatus === 'enabled' ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <div>
                      <p className="text-green-400 font-semibold">Notifications Enabled</p>
                      <p className="text-gray-400 text-sm">You will receive appointment updates</p>
                    </div>
                  </>
                ) : notificationStatus === 'disabled' ? (
                  <>
                    <BellOff className="w-6 h-6 text-yellow-400" />
                    <div>
                      <p className="text-yellow-400 font-semibold">Notifications Disabled</p>
                      <p className="text-gray-400 text-sm">Enable to receive appointment updates</p>
                    </div>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                    <div>
                      <p className="text-blue-400 font-semibold">Checking Status...</p>
                      <p className="text-gray-400 text-sm">Please wait</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Browser Permission Status */}
            <div className="text-sm text-gray-400 mb-3">
              <strong className="text-gray-300">Browser Permission:</strong> {' '}
              <span className={
                browserPermission === 'granted' ? 'text-green-400' :
                browserPermission === 'denied' ? 'text-red-400' :
                'text-yellow-400'
              }>
                {browserPermission === 'granted' ? '✅ Granted' : 
                 browserPermission === 'denied' ? '❌ Denied' : 
                 '⚠️ Not Asked'}
              </span>
            </div>

            {/* Token Info */}
            {tokenInfo && tokenInfo.valid && (
              <div className="text-sm text-gray-400">
                <strong className="text-gray-300">Token Status:</strong> {' '}
                <span className="text-green-400">✅ Valid</span>
              </div>
            )}
            
            {tokenInfo && tokenInfo.needsRefresh && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mt-3">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-yellow-400 font-semibold">Token Needs Refresh</p>
                    <p className="text-gray-400">
                      Your notification token is outdated and may not work. Click "Refresh" to update it.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {browserPermission === 'denied' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded p-3 mt-3">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-red-400 font-semibold">Browser Permission Denied</p>
                    <p className="text-gray-400 mb-2">
                      You have blocked notifications for this site. To enable:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-gray-300">
                      <li>Click the lock/info icon in your browser's address bar</li>
                      <li>Find "Notifications" in the permissions list</li>
                      <li>Change it from "Block" to "Allow"</li>
                      <li>Refresh this page and click "Enable Notifications"</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {notificationStatus === 'disabled' && browserPermission !== 'denied' && (
              <Button
                onClick={handleEnableNotifications}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Enabling...
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    Enable Notifications
                  </>
                )}
              </Button>
            )}

            {notificationStatus === 'enabled' && (
              <Button
                onClick={handleRefreshToken}
                disabled={loading}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Token
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={checkNotificationStatus}
              disabled={loading}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Status
            </Button>
          </div>

          {/* Help Text */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h4 className="text-blue-400 font-semibold mb-2">ℹ️ About Notifications</h4>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• Receive instant updates when doctor marks you as seen</li>
              <li>• Get appointment reminders before your scheduled time</li>
              <li>• Review requests after consultation completion</li>
              <li>• Follow-up care notifications from your doctor</li>
              <li>• Prescription and report updates</li>
            </ul>
          </div>

          {/* Privacy Notice */}
          <div className="text-xs text-gray-500 text-center">
            Your notification preferences are stored securely. We only send important appointment-related updates.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

