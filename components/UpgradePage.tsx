import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { LogOut, Mail, Phone, ShieldAlert } from 'lucide-react';

interface UpgradePageProps {
  onLogout: () => void;
  reason?: 'limit_reached' | 'trial_expired';
}

export default function UpgradePage({ onLogout, reason = 'limit_reached' }: UpgradePageProps) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            {reason === 'limit_reached' ? 'Booking Limit Reached' : 'Trial Expired'}
          </CardTitle>
          <CardDescription className="text-zinc-400 mt-2">
            {reason === 'limit_reached' 
              ? 'You have reached the maximum number of bookings allowed on your current plan.' 
              : 'Your trial period has ended. Please upgrade your subscription to continue using HealQR.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
            <h3 className="font-medium text-white mb-2">How to Upgrade?</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Contact our support team to upgrade your plan and unlock unlimited bookings.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                  <Phone className="w-4 h-4 text-emerald-500" />
                </div>
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-500" />
                </div>
                <span>support@healqr.com</span>
              </div>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
