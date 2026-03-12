import { ArrowLeft } from 'lucide-react';
import healqrLogo from '../assets/healqr-logo.png';

interface TermsOfServiceProps {
  onBack: () => void;
}

export default function TermsOfService({ onBack }: TermsOfServiceProps) {
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
        <h1 className="text-4xl mb-8 text-emerald-500">Terms of Service</h1>
        
        <div className="space-y-6 text-gray-300">
          <p className="text-sm text-gray-400">
            <strong>Effective Date:</strong> November 1, 2025
          </p>
          <p className="text-sm text-gray-400">
            <strong>Last Updated:</strong> November 1, 2025
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>
              Welcome to HealQR.com ("HealQR", "we", "us", or "our"). These Terms of Service ("Terms") govern your access to and use of our QR-based doctor booking platform, website, services, and applications (collectively, the "Services").
            </p>
            <p>
              By accessing or using our Services, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not access or use our Services.
            </p>
            <p>
              <strong>IMPORTANT:</strong> These Terms contain provisions that limit our liability and require you to resolve disputes with us through binding arbitration on an individual basis, not as part of any class or representative action.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">2. Eligibility</h2>
            <p>
              You must be at least 18 years old to use our Services. By using our Services, you represent and warrant that:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You are at least 18 years of age</li>
              <li>You have the legal capacity to enter into these Terms</li>
              <li>You are not prohibited from using the Services under applicable laws</li>
              <li>All information you provide is accurate, current, and complete</li>
              <li>For doctors: You hold valid medical credentials and licenses to practice medicine</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">3. Account Registration</h2>
            
            <h3 className="text-xl text-emerald-500 mt-6 mb-3">3.1 Account Creation</h3>
            <p>
              To access certain features of our Services, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security and confidentiality of your account credentials</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">3.2 Doctor Verification</h3>
            <p>
              Doctors must provide valid medical credentials and professional information. We reserve the right to verify credentials and refuse or terminate accounts that fail verification.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">4. Use of Services</h2>
            
            <h3 className="text-xl text-emerald-500 mt-6 mb-3">4.1 License</h3>
            <p>
              Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use our Services for lawful purposes.
            </p>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">4.2 Prohibited Conduct</h3>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use the Services for any illegal or unauthorized purpose</li>
              <li>Violate any applicable laws, regulations, or third-party rights</li>
              <li>Impersonate any person or entity, or falsely state or misrepresent your affiliation</li>
              <li>Interfere with or disrupt the Services or servers</li>
              <li>Attempt to gain unauthorized access to any portion of the Services</li>
              <li>Use automated systems (bots, scripts, etc.) to access the Services</li>
              <li>Transmit viruses, malware, or other harmful code</li>
              <li>Collect or harvest information from the Services without permission</li>
              <li>Engage in any fraudulent or deceptive practices</li>
              <li>Post or transmit offensive, defamatory, or inappropriate content</li>
              <li>Use the Services to spam or send unsolicited communications</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">5. Subscription Plans and Fees</h2>
            
            <h3 className="text-xl text-emerald-500 mt-6 mb-3">5.1 Subscription Plans</h3>
            <p>
              We offer various subscription plans for doctors, including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Starter Plan:</strong> Free tier with limited bookings (100 bookings / 10 days)</li>
              <li><strong>Scale Plan:</strong> ₹1,999/month or ₹19,999/year (600 bookings / 30 days)</li>
              <li><strong>Pro Plan:</strong> ₹2,999/month or ₹29,999/year (1500 bookings / 30 days)</li>
            </ul>
            <p>
              Additional add-on services are available for separate fees as listed on our platform.
            </p>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">5.2 Payment Terms</h3>
            <p>
              By subscribing to a paid plan, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Pay all applicable fees and charges</li>
              <li>Provide valid payment information</li>
              <li>Authorize automatic recurring billing for subscription renewals</li>
              <li>Pay all applicable taxes, including GST and other governmental charges</li>
            </ul>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">5.3 Billing Cycle</h3>
            <p>
              Subscription fees are billed in advance on a monthly or annual basis, depending on your selected plan. Your subscription will automatically renew unless cancelled before the renewal date.
            </p>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">5.4 Price Changes</h3>
            <p>
              We reserve the right to modify our pricing at any time. We will provide at least 30 days' notice of any price changes. Continued use of the Services after the price change takes effect constitutes acceptance of the new pricing.
            </p>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">5.5 Top-Up Vault</h3>
            <p>
              The Top-Up Vault allows doctors to pre-load credits for additional bookings. Vault credits are non-refundable and will be used automatically when booking limits are reached.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">6. Cancellation and Termination</h2>
            
            <h3 className="text-xl text-emerald-500 mt-6 mb-3">6.1 Cancellation by You</h3>
            <p>
              You may cancel your subscription at any time through your account settings. Cancellation will take effect at the end of your current billing period. You will retain access to paid features until the end of the billing period.
            </p>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">6.2 Termination by Us</h3>
            <p>
              We reserve the right to suspend or terminate your account immediately, without prior notice, if you:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Violate these Terms</li>
              <li>Engage in fraudulent or illegal activities</li>
              <li>Fail to pay applicable fees</li>
              <li>Provide false or misleading information</li>
              <li>Pose a security or legal risk to us or other users</li>
            </ul>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">6.3 Effect of Termination</h3>
            <p>
              Upon termination, your right to use the Services will immediately cease. We may delete your account and all associated data. Termination does not relieve you of any payment obligations incurred prior to termination.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">7. Refund Policy</h2>
            <p className="text-emerald-500">
              <strong>IMPORTANT: NO REFUNDS</strong>
            </p>
            <p>
              All fees paid for subscriptions and services are non-refundable under any circumstances. This includes but is not limited to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Monthly and annual subscription fees</li>
              <li>Add-on service fees</li>
              <li>Top-Up Vault credits</li>
              <li>Partial billing periods</li>
              <li>Unused services or features</li>
            </ul>
            <p>
              Please refer to our separate Refund Policy for complete details. This policy complies with Razorpay's payment gateway requirements and applicable consumer protection laws.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">8. Intellectual Property Rights</h2>
            
            <h3 className="text-xl text-emerald-500 mt-6 mb-3">8.1 Our Rights</h3>
            <p>
              All content, features, and functionality of our Services, including but not limited to text, graphics, logos, icons, images, audio clips, software code, and design, are the exclusive property of HealQR and are protected by copyright, trademark, and other intellectual property laws.
            </p>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">8.2 User Content</h3>
            <p>
              You retain ownership of content you submit or upload to our Services ("User Content"). By submitting User Content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and display such content solely for providing and improving our Services.
            </p>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">8.3 Feedback</h3>
            <p>
              Any feedback, suggestions, or ideas you provide to us become our property, and we may use them without any obligation to you.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">9. Medical Disclaimer</h2>
            <p className="text-yellow-500">
              <strong>IMPORTANT MEDICAL DISCLAIMER</strong>
            </p>
            <p>
              HealQR is a booking platform that facilitates appointments between doctors and patients. We do not:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide medical advice, diagnosis, or treatment</li>
              <li>Endorse any specific doctor, treatment, or medical procedure</li>
              <li>Guarantee the qualifications or competence of healthcare providers</li>
              <li>Assume responsibility for medical outcomes or doctor-patient interactions</li>
            </ul>
            <p>
              The doctor-patient relationship is established directly between the doctor and patient. We are not a party to this relationship and bear no liability for medical services provided.
            </p>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">9.1 Doctor-Patient Communication Disclaimer</h3>
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-red-400 mb-2"><strong>NO LIABILITY FOR COMMUNICATION CONTENT:</strong></p>
              <p className="text-sm mb-3">
                All communications, interactions, and consultations between doctors and patients—whether conducted through video consultations, chat features, messaging systems, or any other communication channels provided by or facilitated through HealQR.com—are <strong>exclusively between the doctor and patient</strong>. HealQR.com has absolutely no role, responsibility, or liability whatsoever for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                <li><strong>Content of Communications:</strong> Any statements, requests, advice, diagnoses, prescriptions, or discussions exchanged between doctor and patient</li>
                <li><strong>Inappropriate Conduct:</strong> Any unprofessional, unethical, or inappropriate behavior by either party, including but not limited to harassment, offensive language, vulgar expressions, or unsuitable requests</li>
                <li><strong>Illegal Activities:</strong> Any unlawful requests, actions, or content shared during consultations, including requests for prohibited procedures, controlled substances, or other illegal activities</li>
                <li><strong>Professional Misconduct:</strong> Any violation of medical ethics, professional standards, or regulatory requirements during doctor-patient interactions</li>
                <li><strong>Privacy Violations:</strong> Any unauthorized disclosure of sensitive, personal, or confidential information by either party during communications</li>
                <li><strong>Clinical Decisions:</strong> Any medical advice, treatment plans, diagnoses, prescriptions, or clinical decisions made during consultations</li>
              </ul>
              <p className="mt-3 text-sm">
                <strong>The doctor-patient relationship and all associated communications exist solely between the healthcare provider and the patient. HealQR.com functions exclusively as a technology platform for scheduling and communication facilitation and bears no responsibility for the nature, content, quality, legality, appropriateness, or consequences of any interactions conducted through the platform.</strong>
              </p>
              <p className="mt-2 text-xs text-gray-400">
                <em>Both doctors and patients are independently responsible for maintaining professional conduct, adhering to applicable laws and regulations, and ensuring appropriate and ethical communication at all times. Any misuse of the communication features or engagement in illegal or unethical conduct is the sole responsibility of the individuals involved.</em>
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">10. Limitation of Liability</h2>
            <p className="text-yellow-500">
              <strong>IMPORTANT LEGAL NOTICE</strong>
            </p>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>OUR SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND</li>
              <li>WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE</li>
              <li>WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</li>
              <li>OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM</li>
              <li>WE ARE NOT LIABLE FOR SERVICE INTERRUPTIONS, DATA LOSS, OR SECURITY BREACHES BEYOND OUR CONTROL</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">11. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless HealQR, its affiliates, officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses (including legal fees) arising from:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Your use of the Services</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of third parties</li>
              <li>Your User Content</li>
              <li>Medical services provided by doctors (if applicable)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">12. Dispute Resolution</h2>
            
            <h3 className="text-xl text-emerald-500 mt-6 mb-3">12.1 Governing Law</h3>
            <p>
              These Terms are governed by the laws of India, without regard to conflict of law principles.
            </p>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">12.2 Arbitration</h3>
            <p>
              Any dispute arising from these Terms or your use of the Services shall be resolved through binding arbitration in accordance with the Arbitration and Conciliation Act, 1996. The arbitration shall be conducted in English and held in [Your City], India.
            </p>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">12.3 Exceptions</h3>
            <p>
              Either party may seek injunctive relief in court for intellectual property infringement or violation of confidentiality obligations.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">13. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify you of material changes by:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Posting the updated Terms on our platform with a new "Last Updated" date</li>
              <li>Sending email notifications to registered users</li>
              <li>Displaying in-app notifications</li>
            </ul>
            <p>
              Your continued use of the Services after such changes constitutes acceptance of the revised Terms. If you do not agree to the changes, you must stop using the Services and cancel your account.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">14. General Provisions</h2>
            
            <h3 className="text-xl text-emerald-500 mt-6 mb-3">14.1 Entire Agreement</h3>
            <p>
              These Terms, together with our Privacy Policy and Refund Policy, constitute the entire agreement between you and HealQR regarding the Services.
            </p>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">14.2 Severability</h3>
            <p>
              If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full effect.
            </p>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">14.3 Waiver</h3>
            <p>
              Our failure to enforce any right or provision of these Terms does not constitute a waiver of such right or provision.
            </p>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">14.4 Assignment</h3>
            <p>
              You may not assign or transfer these Terms without our prior written consent. We may assign our rights and obligations without restriction.
            </p>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">14.5 Force Majeure</h3>
            <p>
              We shall not be liable for any failure to perform due to circumstances beyond our reasonable control, including natural disasters, war, terrorism, riots, or technical failures.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">15. Contact Us</h2>
            <p>
              If you have questions or concerns about these Terms, please contact us:
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
              By using HealQR, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
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
