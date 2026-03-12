import { ArrowLeft } from 'lucide-react';
import healqrLogo from '../assets/healqr-logo.png';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 py-4 px-6">
        <div className="container mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <img src={healqrLogo} alt="HealQR Logo" className="h-8 w-auto" />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-4xl mb-8 text-emerald-500">Privacy Policy</h1>
        
        <div className="space-y-6 text-gray-300">
          <p className="text-sm text-gray-400">
            <strong>Effective Date:</strong> November 1, 2025
          </p>
          <p className="text-sm text-gray-400">
            <strong>Last Updated:</strong> November 1, 2025
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">1. Introduction</h2>
            <p>
              Welcome to HealQR.com ("HealQR", "we", "us", or "our"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our QR-based doctor booking platform and related services.
            </p>
            <p>
              By accessing or using HealQR, you agree to the terms of this Privacy Policy. If you do not agree with our policies and practices, please do not use our services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl text-emerald-500 mt-6 mb-3">2.1 Information You Provide</h3>
            <p>We collect information that you provide directly to us, including:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Account Information:</strong> Name, email address, phone number, professional credentials (for doctors), and authentication details</li>
              <li><strong>Profile Information:</strong> Doctor specialization, clinic details, chamber addresses, consultation fees, and availability schedules</li>
              <li><strong>Patient Information:</strong> Name, age, contact number, and booking preferences</li>
              <li><strong>Payment Information:</strong> Billing details, payment method information, and transaction history (processed securely through our payment gateway partners)</li>
              <li><strong>Communication Data:</strong> Messages, feedback, and support requests sent through our platform</li>
            </ul>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">2.2 Automatically Collected Information</h3>
            <p>When you use our services, we automatically collect:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Device Information:</strong> IP address, browser type, operating system, and device identifiers</li>
              <li><strong>Usage Data:</strong> Pages viewed, features used, time spent on the platform, and interaction patterns</li>
              <li><strong>Location Data:</strong> Approximate location based on IP address (with your consent for precise location)</li>
              <li><strong>Cookies and Similar Technologies:</strong> Data collected through cookies, web beacons, and similar tracking technologies</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">3. How We Use Your Information</h2>
            <p>We use the collected information for the following purposes:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Service Provision:</strong> To create and manage accounts, facilitate bookings, process payments, and deliver notifications</li>
              <li><strong>Platform Improvement:</strong> To analyze usage patterns, improve functionality, and develop new features</li>
              <li><strong>Communication:</strong> To send appointment confirmations, reminders, updates, and respond to inquiries</li>
              <li><strong>Security:</strong> To detect, prevent, and address fraud, security issues, and technical problems</li>
              <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes</li>
              <li><strong>Analytics:</strong> To understand user behavior and optimize our services</li>
              <li><strong>Marketing:</strong> To send promotional materials about new features and services (you can opt-out anytime)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">4. Information Sharing and Disclosure</h2>
            <p>We may share your information in the following circumstances:</p>
            
            <h3 className="text-xl text-emerald-500 mt-6 mb-3">4.1 With Your Consent</h3>
            <p>We share information when you explicitly consent to such sharing.</p>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">4.2 Service Providers</h3>
            <p>We share information with third-party vendors who perform services on our behalf, including:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Payment processing (Razorpay and other payment gateways)</li>
              <li>Cloud hosting services (Google Cloud Platform)</li>
              <li>Analytics and monitoring tools</li>
              <li>Email and notification delivery services</li>
              <li>Customer support platforms</li>
            </ul>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">4.3 Between Doctors and Patients</h3>
            <p>We facilitate the sharing of necessary booking information between doctors and patients to enable appointments. However:</p>
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mt-3">
              <p className="text-yellow-400 mb-2"><strong>IMPORTANT CLARIFICATION:</strong></p>
              <p className="text-sm">
                <strong>HealQR does NOT monitor, control, or assume any responsibility for the content of communications between doctors and patients.</strong> All interactions, consultations, and communications conducted through our platform (including video consultations, chat features, or messaging systems) are solely between the doctor and patient. We have no role or liability regarding:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 mt-2 text-sm">
                <li>The nature, content, or appropriateness of communications</li>
                <li>Any inappropriate, unethical, or illegal conduct during interactions</li>
                <li>Medical advice, diagnoses, or treatment plans discussed</li>
                <li>Privacy breaches or misconduct by either party</li>
              </ul>
              <p className="mt-2 text-sm">
                HealQR functions solely as a technology platform for facilitating connections and does not participate in, endorse, or bear responsibility for doctor-patient communications.
              </p>
            </div>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">4.4 Legal Requirements</h3>
            <p>We may disclose information if required by law, court order, or governmental request, or to protect our rights and safety.</p>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">4.5 Business Transfers</h3>
            <p>In the event of a merger, acquisition, or sale of assets, user information may be transferred to the acquiring entity.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">5. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your information, including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure hosting on Google Cloud Platform (USA Region)</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Employee training on data protection practices</li>
            </ul>
            <p>
              However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">6. Data Retention</h2>
            <p>
              We retain your information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements. Specific retention periods include:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Account Information:</strong> Retained while your account is active and for up to 7 years after account closure for legal and tax purposes</li>
              <li><strong>Transaction Records:</strong> Retained for 7 years as required by applicable financial regulations</li>
              <li><strong>Usage Data:</strong> Typically retained for 2 years for analytics purposes</li>
              <li><strong>Support Communications:</strong> Retained for 3 years</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">7. Your Rights and Choices</h2>
            <p>You have the following rights regarding your personal information:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Access:</strong> Request access to your personal information</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your information (subject to legal retention requirements)</li>
              <li><strong>Data Portability:</strong> Request a copy of your data in a machine-readable format</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Cookie Management:</strong> Control cookie preferences through your browser settings</li>
            </ul>
            <p>
              To exercise these rights, please contact us at <a href="mailto:privacy@healqr.com" className="text-emerald-500 hover:text-emerald-400">privacy@healqr.com</a>.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">8. Children's Privacy</h2>
            <p>
              Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child without parental consent, we will take steps to delete such information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">9. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy and applicable laws.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">10. Third-Party Links</h2>
            <p>
              Our platform may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing any information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">11. Updates to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of material changes by:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Posting the updated policy on our platform with a new "Last Updated" date</li>
              <li>Sending email notifications to registered users</li>
              <li>Displaying in-app notifications for significant changes</li>
            </ul>
            <p>
              Your continued use of our services after such updates constitutes acceptance of the revised Privacy Policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">12. Contact Us</h2>
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mt-4">
              <p><strong>HealQR.com</strong></p>
              <p className="mt-2">Email: <a href="mailto:support@healqr.com" className="text-emerald-500 hover:text-emerald-400">support@healqr.com</a></p>
              <p className="mt-4 text-sm text-gray-400">
                We will respond to your inquiries within 30 days of receipt.
              </p>
            </div>
          </section>

          <section className="space-y-4 mt-12 pt-8 border-t border-zinc-800">
            <p className="text-sm text-gray-400">
              By using HealQR, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.
            </p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 px-6 mt-12">
        <div className="container mx-auto max-w-7xl text-center text-gray-400 text-sm">
          <p>© 2025 HealQR.com. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
