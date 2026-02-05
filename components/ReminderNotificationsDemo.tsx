import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import LowBookingCountAlert from './LowBookingCountAlert';
import { Bell, AlertCircle, Calendar, ShoppingCart } from 'lucide-react';

export default function ReminderNotificationsDemo() {
  const [language, setLanguage] = useState<'en' | 'hi' | 'bn'>('en');
  const [renewalDays, setRenewalDays] = useState(3);
  const [bookingScenario, setBookingScenario] = useState<'low' | 'critical' | 'expired'>('low');

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-white text-3xl mb-2">📬 Reminder Notifications System</h1>
          <p className="text-gray-400">
            Subscription renewal reminders and low booking count alerts with rule enforcement
          </p>
        </div>

        {/* Controls */}
        <Card className="bg-zinc-900 border-zinc-800 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-white text-sm mb-2 block">Language</label>
              <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                  <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">Renewal Days</label>
              <Select value={renewalDays.toString()} onValueChange={(val) => setRenewalDays(parseInt(val))}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="3">3 Days</SelectItem>
                  <SelectItem value="2">2 Days</SelectItem>
                  <SelectItem value="1">Tomorrow</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">Booking Scenario</label>
              <Select value={bookingScenario} onValueChange={(val: any) => setBookingScenario(val)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="low">Low (25% remaining)</SelectItem>
                  <SelectItem value="critical">Critical (0 bookings)</SelectItem>
                  <SelectItem value="expired">Expired Subscription</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="renewal" className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="renewal" className="data-[state=active]:bg-emerald-600">
              <Calendar className="w-4 h-4 mr-2" />
              Renewal Reminders
            </TabsTrigger>
            <TabsTrigger value="bookings" className="data-[state=active]:bg-emerald-600">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Booking Alerts
            </TabsTrigger>
            <TabsTrigger value="rules" className="data-[state=active]:bg-emerald-600">
              <AlertCircle className="w-4 h-4 mr-2" />
              System Rules
            </TabsTrigger>
          </TabsList>

          {/* Subscription Renewal Reminders - Removed (Project is Free) */}
          <TabsContent value="renewal" className="space-y-6">
            <div>
              <h2 className="text-white text-xl mb-4">Subscription Features Removed</h2>
              <Card className="bg-zinc-900 border-zinc-800 p-6">
                <p className="text-gray-400">
                  Subscription renewal reminders have been removed as HealQR is now completely free.
                </p>
              </Card>
            </div>
          </TabsContent>

          {/* Low Booking Count Alerts */}
          <TabsContent value="bookings" className="space-y-6">
            <div>
              <h2 className="text-white text-xl mb-4">Low Booking Count Alert</h2>
              
              {/* Growth Plan - Low bookings (Can top-up) */}
              {bookingScenario === 'low' && (
                <LowBookingCountAlert
                  currentPlan="growth"
                  remainingBookings={60}
                  totalBookings={250}
                  daysUntilRenewal={12}
                  renewalDate="15th November"
                  isSubscriptionActive={true}
                  vaultBookings={44}
                  language={language}
                  onDismiss={() => console.log('Dismissed')}
                  onTopUp={() => console.log('Top-up clicked')}
                  onUpgradePlan={() => console.log('Upgrade clicked')}
                />
              )}

              {/* Pro Plan - Critical (0 bookings, Can top-up) */}
              {bookingScenario === 'critical' && (
                <LowBookingCountAlert
                  currentPlan="pro"
                  remainingBookings={0}
                  totalBookings={1500}
                  daysUntilRenewal={8}
                  renewalDate="15th November"
                  isSubscriptionActive={true}
                  vaultBookings={12}
                  language={language}
                  onDismiss={() => console.log('Dismissed')}
                  onTopUp={() => console.log('Top-up clicked')}
                  onUpgradePlan={() => console.log('Upgrade clicked')}
                />
              )}

              {/* Scale Plan - Expired subscription (Cannot top-up) */}
              {bookingScenario === 'expired' && (
                <LowBookingCountAlert
                  currentPlan="scale"
                  remainingBookings={0}
                  totalBookings={600}
                  daysUntilRenewal={0}
                  renewalDate="Expired"
                  isSubscriptionActive={false}
                  vaultBookings={25}
                  language={language}
                  onDismiss={() => console.log('Dismissed')}
                  onTopUp={() => console.log('Top-up clicked')}
                  onUpgradePlan={() => console.log('Renew subscription clicked')}
                />
              )}
            </div>

            {/* Scenario Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-zinc-900 border-zinc-800 p-4">
                <h3 className="text-yellow-400 mb-2">RULE 1: Starter Plan</h3>
                <p className="text-sm text-gray-400 mb-3">No top-up option, only upgrade available</p>
                <LowBookingCountAlert
                  currentPlan="starter"
                  remainingBookings={5}
                  totalBookings={50}
                  daysUntilRenewal={10}
                  renewalDate="15th November"
                  isSubscriptionActive={true}
                  vaultBookings={0}
                  language={language}
                  onDismiss={() => console.log('Dismissed')}
                  onUpgradePlan={() => console.log('Upgrade required')}
                />
              </Card>

              <Card className="bg-zinc-900 border-zinc-800 p-4">
                <h3 className="text-orange-400 mb-2">Low Bookings</h3>
                <p className="text-sm text-gray-400 mb-3">25% remaining - can top-up</p>
                <Button 
                  onClick={() => setBookingScenario('low')}
                  size="sm"
                  variant="outline"
                  className="w-full border-zinc-700 text-white hover:bg-zinc-800"
                >
                  Preview
                </Button>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800 p-4">
                <h3 className="text-red-400 mb-2">RULE 2: Expired</h3>
                <p className="text-sm text-gray-400 mb-3">Top-up locked until renewal</p>
                <Button 
                  onClick={() => setBookingScenario('expired')}
                  size="sm"
                  variant="outline"
                  className="w-full border-zinc-700 text-white hover:bg-zinc-800"
                >
                  Preview
                </Button>
              </Card>
            </div>
          </TabsContent>

          {/* System Rules */}
          <TabsContent value="rules">
            <div className="space-y-4">
              <Card className="bg-zinc-900 border-zinc-800 p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-yellow-500/20">
                    <AlertCircle className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white mb-2">RULE 1: Starter Plan Restrictions</h3>
                    <p className="text-gray-400 text-sm mb-3">
                      Starter plan does not support top-up bookings. Users can only upgrade to a paid subscription plan.
                    </p>
                    <div className="bg-zinc-800 border border-zinc-700 rounded p-3">
                      <p className="text-xs text-gray-400">
                        <span className="text-yellow-400">✓</span> Upgrade to paid plan available<br/>
                        <span className="text-red-400">✗</span> Top-up vault not accessible
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800 p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-red-500/20">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white mb-2">RULE 2: Subscription Expiry</h3>
                    <p className="text-gray-400 text-sm mb-3">
                      When subscription expires, all services are deactivated. Top-up bookings will NOT work without an active subscription.
                    </p>
                    <div className="bg-zinc-800 border border-zinc-700 rounded p-3">
                      <p className="text-xs text-gray-400">
                        <span className="text-red-400">✗</span> Cannot accept new patient bookings<br/>
                        <span className="text-red-400">✗</span> Top-up vault locked<br/>
                        <span className="text-red-400">✗</span> All premium features disabled<br/>
                        <span className="text-emerald-400">✓</span> Must renew subscription to reactivate
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800 p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-blue-500/20">
                    <Bell className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white mb-2">RULE 3: Special Commitment - Follow-up Notifications</h3>
                    <p className="text-gray-400 text-sm mb-3">
                      If follow-up notifications are scheduled, they will continue to be delivered even during the deactivated period.
                    </p>
                    <div className="bg-zinc-800 border border-zinc-700 rounded p-3">
                      <p className="text-xs text-gray-400">
                        <span className="text-blue-400">✓</span> Follow-up notifications continue during deactivation<br/>
                        <span className="text-blue-400">✓</span> Maintains patient care commitment<br/>
                        <span className="text-blue-400">✓</span> Automatic delivery via FCM
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Renewal Reminder Schedule */}
              <Card className="bg-zinc-900 border-zinc-800 p-6">
                <h3 className="text-white mb-4">Subscription Renewal Reminder Schedule</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-zinc-800 border border-zinc-700 rounded">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">3 Days Before Renewal</p>
                      <p className="text-xs text-gray-400">First reminder with low urgency (yellow theme)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-zinc-800 border border-zinc-700 rounded">
                    <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">2 Days Before Renewal</p>
                      <p className="text-xs text-gray-400">Second reminder with medium urgency (orange theme)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-zinc-800 border border-zinc-700 rounded">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 animate-pulse">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">Tomorrow (1 Day Before)</p>
                      <p className="text-xs text-gray-400">Final reminder with high urgency (red theme + pulse animation)</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
