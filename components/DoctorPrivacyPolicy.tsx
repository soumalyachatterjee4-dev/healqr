import { X } from 'lucide-react';

interface DoctorPrivacyPolicyProps {
  onClose: () => void;
}

export default function DoctorPrivacyPolicy({ onClose }: DoctorPrivacyPolicyProps) {
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 rounded-2xl max-w-4xl w-full my-8 border border-zinc-800">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-8 py-6 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-2xl text-emerald-500">Privacy Policy for Doctors</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-6 text-gray-300 space-y-6 max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-gray-400">
            <strong>Last Updated:</strong> November 1, 2025
          </p>

          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 text-sm">
            <p className="text-blue-400">
              <strong>YOUR PRIVACY MATTERS:</strong> This Privacy Policy explains how Veziit.com collects, uses, stores, and protects your personal and practice information as a registered doctor on our platform.
            </p>
          </div>

          {/* 1. Introduction */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">1. Introduction</h3>
            <p className="text-sm">
              At <strong>Veziit.com</strong>, we take your privacy seriously. As a healthcare provider using our QR-based booking platform, you entrust us with sensitive professional and patient information. This Privacy Policy outlines our commitment to protecting that data.
            </p>
            <p className="mt-3 text-sm">
              By registering as a doctor on Veziit.com, you consent to the data practices described in this policy.
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">2. Information We Collect</h3>
            
            <h4 className="text-lg text-emerald-400 mb-2">2.1 Doctor Registration Information</h4>
            <p className="text-sm">When you create an account, we collect:</p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2 text-sm">
              <li><strong>Personal Information:</strong> Full name, date of birth, email address</li>
              <li><strong>Location Data:</strong> Residential pin code</li>
              <li><strong>Referral Information:</strong> Business Associate (BA) code (if provided)</li>
            </ul>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">2.2 Professional Profile Information</h4>
            <p className="text-sm">You may provide:</p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2 text-sm">
              <li>Medical specialization and qualifications</li>
              <li>Medical registration/license numbers</li>
              <li>Chamber/clinic addresses and contact details</li>
              <li>Consultation fees and pricing</li>
              <li>Practice hours and availability schedules</li>
              <li>Profile photos and practice images</li>
              <li>Language preferences (English, Hindi, Bengali)</li>
            </ul>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">2.3 Patient Booking Data</h4>
            <p className="text-sm">We collect and store:</p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2 text-sm">
              <li>Patient names, ages, and contact information</li>
              <li>Booking dates, times, and chamber selections</li>
              <li>Token/queue numbers</li>
              <li>Booking status (confirmed, completed, cancelled)</li>
              <li>Patient health concerns/visit reasons (if provided by patient)</li>
              <li>Follow-up appointment records</li>
            </ul>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">2.4 Financial Information</h4>
            <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
              <li>Subscription plan selections</li>
              <li>Payment transaction IDs (via Razorpay)</li>
              <li>Top-up vault transactions</li>
              <li>Advertising revenue earnings (future feature)</li>
            </ul>
            <p className="mt-2 text-sm text-yellow-400">
              <strong>Note:</strong> We do NOT store your credit card numbers or banking details. All payment processing is handled securely by Razorpay.
            </p>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">2.5 Usage Analytics</h4>
            <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
              <li>Login activity and access times</li>
              <li>Feature usage statistics</li>
              <li>Booking trends and patterns</li>
              <li>Device information (browser, OS, IP address)</li>
              <li>QR code scan analytics</li>
            </ul>
          </section>

          {/* 3. How We Use Your Information */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">3. How We Use Your Information</h3>
            
            <h4 className="text-lg text-emerald-400 mb-2">3.1 Service Delivery</h4>
            <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
              <li>Create and maintain your doctor account</li>
              <li>Generate personalized QR codes for your chambers</li>
              <li>Process patient bookings and manage schedules</li>
              <li>Send FCM notifications (appointment confirmations, reminders, etc.)</li>
              <li>Provide multilingual translation services</li>
              <li>Display your practice information on your mini-website</li>
            </ul>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">3.2 Analytics & Reporting</h4>
            <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
              <li>Generate booking analytics and insights</li>
              <li>Create revenue and performance reports</li>
              <li>Track booking trends over time</li>
              <li>Provide patient demographic summaries</li>
            </ul>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">3.3 Communication</h4>
            <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
              <li>Send subscription renewal reminders</li>
              <li>Notify about platform updates and new features</li>
              <li>Provide customer support and technical assistance</li>
              <li>Send administrative notifications about your account</li>
            </ul>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">3.4 Platform Improvement</h4>
            <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
              <li>Analyze usage patterns to enhance user experience</li>
              <li>Identify and fix technical issues</li>
              <li>Develop new features based on doctor needs</li>
              <li>Conduct security audits and fraud prevention</li>
            </ul>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">3.5 Advertising (Future)</h4>
            <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
              <li>Display relevant third-party advertisements on booking pages</li>
              <li>Calculate and distribute advertising revenue shares</li>
              <li>Provide advertising performance reports</li>
            </ul>
          </section>

          {/* 4. Data Security */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">4. Data Security & Protection</h3>
            
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
              <p className="text-green-400 mb-3"><strong>ENTERPRISE-GRADE SECURITY MEASURES:</strong></p>
              
              <h4 className="text-sm mb-2"><strong>Encryption:</strong></h4>
              <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                <li><strong>At Rest:</strong> AES-256 bit encryption for all stored data</li>
                <li><strong>In Transit:</strong> TLS 1.3 encryption for all data transfers</li>
                <li><strong>Passwords:</strong> Bcrypt hashing with salt (industry standard)</li>
              </ul>

              <h4 className="text-sm mt-3 mb-2"><strong>Infrastructure Security:</strong></h4>
              <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                <li>Hosted on <strong>Google Cloud Platform (USA Region)</strong></li>
                <li>HIPAA-compliant cloud infrastructure</li>
                <li>99.9% uptime SLA with geo-redundancy</li>
                <li>Automatic daily backups with 30-day retention</li>
                <li>DDoS protection and firewall security</li>
              </ul>

              <h4 className="text-sm mt-3 mb-2"><strong>Access Controls:</strong></h4>
              <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                <li>Role-based access control (RBAC)</li>
                <li>Multi-factor authentication (MFA) available</li>
                <li>Secure session management with auto-logout</li>
                <li>IP-based access logging and monitoring</li>
              </ul>

              <h4 className="text-sm mt-3 mb-2"><strong>Compliance:</strong></h4>
              <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                <li>Regular third-party security audits</li>
                <li>Penetration testing by certified professionals</li>
                <li>Compliance with Indian IT Act 2000</li>
                <li>GDPR-ready data handling procedures</li>
              </ul>
            </div>
          </section>

          {/* 5. Data Sharing */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">5. Data Sharing & Disclosure</h3>
            
            <h4 className="text-lg text-emerald-400 mb-2">5.1 Who We Share With</h4>
            
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 mb-4">
              <p className="text-sm mb-2"><strong>Service Providers:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                <li><strong>Google Cloud:</strong> Secure hosting and data storage</li>
                <li><strong>Razorpay:</strong> Payment processing (they handle financial transactions)</li>
                <li><strong>Firebase Cloud Messaging (FCM):</strong> Push notification delivery</li>
                <li><strong>Email Service Provider:</strong> Transactional emails and notifications</li>
              </ul>
              <p className="text-xs text-gray-400 mt-2">All third-party providers are bound by strict confidentiality and security agreements.</p>
            </div>

            <h4 className="text-lg text-emerald-400 mb-2">5.2 Public Information</h4>
            <p className="text-sm">The following information is publicly visible on your mini-website and booking pages:</p>
            <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
              <li>Doctor name and specialization</li>
              <li>Chamber addresses and timings</li>
              <li>Consultation fees</li>
              <li>Profile photo (if provided)</li>
              <li>Patient reviews and ratings</li>
            </ul>
            <p className="mt-2 text-sm text-yellow-400">
              <strong>Note:</strong> Your date of birth, residential pin code, email, and financial data are NEVER made public.
            </p>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">5.3 Legal Disclosures</h4>
            <p className="text-sm">We may disclose your information if required by:</p>
            <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
              <li>Valid legal process (court orders, subpoenas)</li>
              <li>Law enforcement requests</li>
              <li>Compliance with Indian laws and regulations</li>
              <li>Protection of our legal rights or safety of users</li>
            </ul>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">5.4 Business Transfers</h4>
            <p className="text-sm">
              In the event of a merger, acquisition, or sale of Veziit.com, your information may be transferred to the new entity. You will be notified of any such change.
            </p>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">5.5 What We DON'T Do</h4>
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-red-400 mb-2"><strong>WE NEVER:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                <li>Sell your personal information to third parties</li>
                <li>Share patient data with unauthorized parties</li>
                <li>Use your data for unrelated marketing purposes</li>
                <li>Rent or lease your contact information</li>
                <li>Share your financial information with advertisers</li>
              </ul>
            </div>
          </section>

          {/* 6. Data Retention */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">6. Data Retention</h3>
            
            <h4 className="text-lg text-emerald-400 mb-2">6.1 How Long We Keep Your Data</h4>
            <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
              <li><strong>Active Accounts:</strong> Data retained as long as your account is active</li>
              <li><strong>Booking Records:</strong> Retained for 7 years (medical record best practices)</li>
              <li><strong>Financial Records:</strong> Retained for 7 years (tax compliance)</li>
              <li><strong>Analytics Data:</strong> Aggregated and anonymized after 2 years</li>
              <li><strong>Deleted Accounts:</strong> Data permanently deleted within 90 days of account closure</li>
            </ul>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">6.2 Account Deletion</h4>
            <p className="text-sm">
              You can request account deletion by contacting support@veziit.com. Upon deletion:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2 text-sm">
              <li>Your personal information is permanently removed</li>
              <li>Your chambers and QR codes are deactivated</li>
              <li>Patient booking data is anonymized (retained for legal compliance)</li>
              <li>Your mini-website is taken offline</li>
            </ul>
            <p className="mt-2 text-sm text-red-400">
              <strong>Note:</strong> Account deletion is irreversible and no refunds are provided.
            </p>
          </section>

          {/* 7. Your Rights */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">7. Your Privacy Rights</h3>
            
            <p className="text-sm">As a registered doctor, you have the right to:</p>
            
            <div className="space-y-3 mt-3">
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
                <p className="text-sm"><strong className="text-emerald-400">Access:</strong> Request a copy of all data we hold about you</p>
              </div>
              
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
                <p className="text-sm"><strong className="text-emerald-400">Correction:</strong> Update or correct inaccurate information in your profile</p>
              </div>
              
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
                <p className="text-sm"><strong className="text-emerald-400">Deletion:</strong> Request deletion of your account and associated data</p>
              </div>
              
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
                <p className="text-sm"><strong className="text-emerald-400">Portability:</strong> Receive your data in a machine-readable format (CSV/JSON)</p>
              </div>
              
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
                <p className="text-sm"><strong className="text-emerald-400">Object:</strong> Opt-out of certain data processing activities</p>
              </div>
              
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
                <p className="text-sm"><strong className="text-emerald-400">Withdraw Consent:</strong> Revoke previously given permissions</p>
              </div>
            </div>

            <p className="text-sm mt-4">
              To exercise any of these rights, email <a href="mailto:support@veziit.com" className="text-emerald-500 hover:text-emerald-400">support@veziit.com</a> with your request. We will respond within 30 days.
            </p>
          </section>

          {/* 8. Cookies & Tracking */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">8. Cookies & Tracking Technologies</h3>
            
            <h4 className="text-lg text-emerald-400 mb-2">8.1 What We Use</h4>
            <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
              <li><strong>Essential Cookies:</strong> Required for login and session management</li>
              <li><strong>Analytics Cookies:</strong> Track usage patterns to improve the platform</li>
              <li><strong>Preference Cookies:</strong> Remember your settings (language, theme)</li>
            </ul>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">8.2 Cookie Control</h4>
            <p className="text-sm">
              You can control cookies through your browser settings. However, disabling essential cookies may limit platform functionality.
            </p>
          </section>

          {/* 9. International Data Transfers */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">9. International Data Transfers</h3>
            <p className="text-sm">
              Your data is stored on <strong>Google Cloud Platform - USA Region</strong>. By using Veziit.com, you consent to this cross-border data transfer. We ensure adequate protection through:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2 text-sm">
              <li>Standard Contractual Clauses (SCCs)</li>
              <li>GDPR-compliant data processing agreements</li>
              <li>Equivalent security measures as required by Indian law</li>
            </ul>
          </section>

          {/* 10. Children's Privacy */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">10. Children's Privacy</h3>
            <p className="text-sm">
              Veziit.com is intended for licensed medical professionals aged 18 and above. We do not knowingly collect information from minors. If you are under 18, do not register on our platform.
            </p>
          </section>

          {/* 11. Changes to Privacy Policy */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">11. Changes to This Privacy Policy</h3>
            <p className="text-sm">
              We may update this Privacy Policy periodically. Changes will be:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2 text-sm">
              <li>Posted with an updated "Last Updated" date</li>
              <li>Notified via email to your registered address</li>
              <li>Effective 30 days after notification</li>
            </ul>
            <p className="mt-2 text-sm">
              Continued use of the platform after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* 12. Contact Us */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">12. Contact Us About Privacy</h3>
            <p className="text-sm">
              If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 mt-3">
              <p className="text-sm"><strong>Veziit.com</strong></p>
              <p className="text-sm mt-2">Email: <a href="mailto:support@veziit.com" className="text-emerald-500 hover:text-emerald-400">support@veziit.com</a></p>
              <p className="text-sm mt-1 text-gray-400">We will respond to your inquiries within 30 days of receipt.</p>
            </div>
          </section>

          {/* Final Note */}
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6 mt-8">
            <p className="text-sm text-center">
              <strong className="text-blue-400">BY USING VEZIIT.COM:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 mt-4 text-sm">
              <li>You acknowledge that you have read and understood this Privacy Policy</li>
              <li>You consent to the collection, use, and storage of your data as described</li>
              <li>You understand that your data is encrypted and securely stored</li>
              <li>You accept the data retention and deletion policies</li>
              <li>You agree to international data transfers to USA-based cloud servers</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 px-8 py-4 flex justify-end rounded-b-2xl">
          <button
            onClick={onClose}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
