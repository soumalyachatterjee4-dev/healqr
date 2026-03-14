import { X } from 'lucide-react';

interface DoctorTermsConditionsProps {
  onClose: () => void;
  onNavigateToPricing?: () => void;
}

export default function DoctorTermsConditions({ onClose, onNavigateToPricing }: DoctorTermsConditionsProps) {
  const handlePricingClick = () => {
    onClose(); // Close the modal first
    if (onNavigateToPricing) {
      setTimeout(() => {
        onNavigateToPricing();
      }, 100); // Small delay to ensure modal closes smoothly
    } else {
      // Fallback: scroll to pricing section if already on landing page
      setTimeout(() => {
        const pricingSection = document.getElementById('pricing');
        if (pricingSection) {
          pricingSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 rounded-2xl max-w-4xl w-full my-8 border border-zinc-800">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-8 py-6 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-2xl text-emerald-500">Terms & Conditions for Doctors</h2>
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

          <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-4 text-sm">
            <p className="text-emerald-400">
              <strong>IMPORTANT:</strong> By registering as a doctor on Veziit.com, you agree to these Terms & Conditions. Please read carefully before proceeding.
            </p>
          </div>

          {/* 1. Service Agreement */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">1. Service Agreement</h3>
            <p>
              Welcome to <strong>Veziit.com</strong>, the world's first QR-based doctor booking platform. By creating an account as a healthcare provider ("Doctor"), you enter into a binding agreement with Veziit.com ("Platform", "We", "Us", "Our").
            </p>
            <p className="mt-3">
              These Terms & Conditions ("Terms") govern your use of our platform, including all features, tools, and services provided to doctors for managing patient bookings, schedules, and communications.
            </p>
          </section>

          {/* 2. Platform Role & Responsibilities */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">2. Platform Role & Responsibilities</h3>
            
            <h4 className="text-lg text-emerald-400 mb-2 mt-4">2.1 What We Provide</h4>
            <p>Veziit.com provides:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
              <li>QR code generation and management system</li>
              <li>Patient booking and scheduling tools</li>
              <li>Multi-language translation services (English, Hindi, Bengali)</li>
              <li>FCM-based notification delivery system</li>
              <li>Analytics and reporting dashboard</li>
              <li>Digital mini-website for your practice</li>
              <li>Secure cloud hosting infrastructure</li>
            </ul>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">2.2 What We Don't Provide</h4>
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mt-3">
              <p className="text-red-400 mb-2"><strong>DISCLAIMER - NO MEDICAL RESPONSIBILITY:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                <li><strong>We are NOT a medical service provider</strong></li>
                <li>We do NOT provide medical advice, diagnosis, or treatment</li>
                <li>We do NOT verify medical credentials or qualifications</li>
                <li>We are NOT responsible for the quality of medical care provided</li>
                <li>We do NOT mediate medical disputes between doctors and patients</li>
                <li>We assume NO liability for medical outcomes or malpractice</li>
              </ul>
              <p className="mt-3 text-sm">
                <strong>You, the doctor, are solely responsible for all medical services, diagnoses, treatments, and patient care.</strong>
              </p>
            </div>
          </section>

          {/* 3. Communication Responsibility */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">3. Communication Responsibility</h3>
            
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
              <p className="text-yellow-400 mb-2"><strong>DISCLAIMER - NO COMMUNICATION RESPONSIBILITY:</strong></p>
              <p className="text-sm">
                Veziit.com is <strong>NOT responsible for communication</strong> between doctors and patients. We provide notification delivery tools, but:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-2 text-sm">
                <li>We do NOT guarantee delivery of notifications due to device/network issues</li>
                <li>We are NOT responsible for misunderstandings or miscommunications</li>
                <li>We do NOT moderate or control the content of communications</li>
                <li>Doctors must maintain independent communication channels with patients</li>
                <li>Any critical medical communication should use direct methods (phone, in-person)</li>
              </ul>
              <p className="mt-3 text-sm">
                <strong>The doctor-patient communication relationship is solely between you and your patients.</strong>
              </p>
            </div>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">3.1 Doctor-Patient Interactions Disclaimer</h4>
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-red-400 mb-2"><strong>CRITICAL DISCLAIMER - NO LIABILITY FOR COMMUNICATION CONTENT:</strong></p>
              <p className="text-sm mb-3">
                All communications, interactions, and consultations between doctors and patients—whether conducted through video consultations, chat features, messaging systems, or any other communication channels provided by or facilitated through Veziit.com—are <strong>exclusively between the doctor and patient</strong>. Veziit.com has absolutely no role, responsibility, or liability whatsoever for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                <li><strong>Content of Communications:</strong> Any statements, requests, advice, diagnoses, prescriptions, or discussions exchanged between doctor and patient</li>
                <li><strong>Inappropriate Conduct:</strong> Any unprofessional, unethical, or inappropriate behavior by either party, including but not limited to harassment, offensive language, or unsuitable requests</li>
                <li><strong>Illegal Activities:</strong> Any unlawful requests, actions, or content shared during consultations, including requests for prohibited procedures or substances</li>
                <li><strong>Professional Misconduct:</strong> Any violation of medical ethics, professional standards, or regulatory requirements during doctor-patient interactions</li>
                <li><strong>Privacy Violations:</strong> Any unauthorized disclosure of sensitive, personal, or confidential information by either party</li>
                <li><strong>Clinical Decisions:</strong> Any medical advice, treatment plans, diagnoses, or clinical decisions made during consultations</li>
              </ul>
              <p className="mt-3 text-sm">
                <strong>The doctor-patient relationship and all associated communications exist solely between the healthcare provider and the patient. Veziit.com functions exclusively as a technology platform for scheduling and communication facilitation and bears no responsibility for the nature, content, quality, legality, or appropriateness of any interactions conducted through the platform.</strong>
              </p>
              <p className="mt-2 text-xs text-gray-400">
                <em>Both doctors and patients are independently responsible for maintaining professional conduct, adhering to applicable laws and regulations, and ensuring appropriate and ethical communication at all times.</em>
              </p>
            </div>
          </section>

          {/* 4. Advertising & Revenue Sharing */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">4. Advertising & Revenue Sharing Program</h3>
            
            <h4 className="text-lg text-emerald-400 mb-2">4.1 Third-Party Advertising</h4>
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <p className="text-blue-400 mb-2"><strong>FUTURE FEATURE:</strong></p>
              <p className="text-sm">
                Veziit.com reserves the right to display <strong>third-party advertisements</strong> on the following doctor-owned properties:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 mt-2 text-sm">
                <li>Patient booking process pages</li>
                <li>Patient notification screens</li>
                <li>Doctor's mini-website pages</li>
                <li>Appointment confirmation pages</li>
                <li>Any other patient-facing interfaces within your chamber/practice area</li>
              </ul>
            </div>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">4.2 Revenue Distribution Model</h4>
            <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-4">
              <p className="text-emerald-400 mb-3"><strong>REVENUE SHARING BREAKDOWN:</strong></p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-zinc-800 rounded p-3">
                  <p className="text-gray-400 mb-1">Doctor's Share</p>
                  <p className="text-2xl text-emerald-500"><strong>29%</strong></p>
                </div>
                <div className="bg-zinc-800 rounded p-3">
                  <p className="text-gray-400 mb-1">Platform's Share</p>
                  <p className="text-2xl text-emerald-500"><strong>61%</strong></p>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-400">
                <em>Note: The remaining 10% covers payment processing fees, taxes, and operational costs.</em>
              </p>
            </div>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">4.3 Advertising Terms</h4>
            <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
              <li>Advertisements will be clearly marked as "Sponsored" or "Advertisement"</li>
              <li>Veziit.com maintains full control over ad content, placement, and frequency</li>
              <li>Doctors cannot opt-out of advertising on their booking pages</li>
              <li>Revenue sharing applies only when advertising program is active</li>
              <li>Payments will be processed monthly via the doctor's registered account</li>
              <li>Minimum payout threshold: ₹500 (Indian Rupees)</li>
              <li>Tax compliance and reporting is the doctor's responsibility</li>
            </ul>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">4.4 Advertisement Content Standards</h4>
            <p className="text-sm">Veziit.com will ensure that:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
              <li>No advertisements for competing medical services appear on your pages</li>
              <li>Medical advertisements comply with relevant healthcare regulations</li>
              <li>No inappropriate, offensive, or harmful content is displayed</li>
              <li>Advertisements do not interfere with critical booking functionality</li>
            </ul>
          </section>

          {/* 5. Payment & Subscription Terms */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">5. Payment & Subscription Terms</h3>
            
            <h4 className="text-lg text-emerald-400 mb-2">5.1 Subscription Plans & Pricing</h4>
            <p className="text-sm">
              Veziit.com operates on a subscription-based model with multiple plan options to suit different practice sizes.
            </p>
            
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mt-3">
              <p className="text-blue-400 mb-2"><strong>📋 CURRENT PRICING:</strong></p>
              <p className="text-sm">
                For the most up-to-date pricing information, subscription plans, and one-time top-up options, please refer to the <strong>Pricing section</strong> on our landing page:
              </p>
              <div className="mt-3 text-center">
                <button 
                  onClick={handlePricingClick}
                  className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg transition-colors text-sm cursor-pointer"
                >
                  View Current Pricing Plans →
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                <em>Note: Prices are subject to change. The landing page always reflects the most current pricing and plan details.</em>
              </p>
            </div>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">5.1.2 Plan Features</h4>
            <p className="text-sm">
              We offer multiple subscription tiers including:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2 text-sm">
              <li><strong>Free Starter Plan:</strong> Available upon sign-up with limited bookings</li>
              <li><strong>Growth, Scale, Pro, and Summit Plans:</strong> Paid monthly or annual subscriptions with increasing booking limits</li>
              <li><strong>One-Time Top-ups:</strong> Purchase additional bookings with lifetime validity and no expiry</li>
            </ul>
            <p className="text-sm mt-2">
              All plan details, booking limits, and pricing are clearly outlined on our pricing page.
            </p>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">5.2 Payment Processing</h4>
            <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
              <li>All payments are processed through <strong>Razorpay</strong></li>
              <li>Payments are secured with industry-standard encryption</li>
              <li>We accept UPI, credit/debit cards, net banking, and digital wallets</li>
              <li>All prices are in Indian Rupees (₹) unless stated otherwise</li>
              <li>Prices may be subject to applicable GST and taxes</li>
            </ul>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">5.3 Refund Policy</h4>
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-red-400 mb-2"><strong>STRICT NO REFUND POLICY:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                <li><strong>All subscription payments are NON-REFUNDABLE</strong></li>
                <li>No refunds for partial months or unused bookings</li>
                <li>No refunds if you cancel your subscription mid-term</li>
                <li>No refunds for service dissatisfaction or change of mind</li>
                <li>No refunds for technical issues on the doctor's end (internet, device, etc.)</li>
              </ul>
              <p className="mt-3 text-sm">
                <strong>By subscribing, you acknowledge and accept this no-refund policy.</strong>
              </p>
              <p className="mt-2 text-sm text-gray-400">
                <em>Exception: Refunds may be considered only in cases of proven fraudulent transactions or billing errors initiated by Veziit.com.</em>
              </p>
            </div>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">5.4 Automatic Renewal</h4>
            <p className="text-sm">
              Subscriptions automatically renew unless cancelled before the renewal date. You will receive reminder notifications 15 days, 7 days, and 1 day before renewal.
            </p>
          </section>

          {/* 6. Data Security & Privacy */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">6. Data Security & Privacy</h3>
            
            <h4 className="text-lg text-emerald-400 mb-2">6.1 Data Encryption</h4>
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
              <p className="text-green-400 mb-2"><strong>ENTERPRISE-GRADE SECURITY:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                <li>All data is encrypted <strong>at rest and in transit</strong></li>
                <li>We use <strong>AES-256 encryption</strong> for stored data</li>
                <li>All connections use <strong>TLS/SSL encryption</strong></li>
                <li>Password storage uses industry-standard <strong>bcrypt hashing</strong></li>
                <li>Multi-factor authentication available for enhanced security</li>
                <li>Regular security audits and penetration testing</li>
              </ul>
            </div>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">6.2 Data Hosting</h4>
            <p className="text-sm">
              All data is securely hosted on <strong>Google Cloud Platform - USA Region</strong> with:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2 text-sm">
              <li>99.9% uptime SLA guarantee</li>
              <li>Automatic daily backups</li>
              <li>Geo-redundancy and disaster recovery</li>
              <li>HIPAA-compliant infrastructure</li>
            </ul>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">6.3 Doctor Responsibilities</h4>
            <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
              <li>Maintain confidentiality of your login credentials</li>
              <li>Do NOT share your account with unauthorized persons</li>
              <li>Report any security breaches immediately to support@veziit.com</li>
              <li>Comply with applicable medical data privacy regulations (HIPAA, etc.)</li>
              <li>Ensure patient consent for data collection and storage</li>
            </ul>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">6.4 Data Retention</h4>
            <p className="text-sm">
              Patient booking data is retained for <strong>7 years</strong> as per medical record retention best practices, unless deletion is requested in writing.
            </p>
          </section>

          {/* 7. Doctor Obligations */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">7. Doctor Obligations & Conduct</h3>
            
            <h4 className="text-lg text-emerald-400 mb-2">7.1 Professional Conduct</h4>
            <p className="text-sm">You agree to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
              <li>Provide accurate and truthful information about your qualifications</li>
              <li>Maintain valid medical licenses and certifications</li>
              <li>Comply with all applicable medical and healthcare regulations</li>
              <li>Treat all patients with dignity, respect, and professionalism</li>
              <li>Honor booked appointments or provide reasonable notice of cancellations</li>
              <li>Maintain patient confidentiality in accordance with medical ethics</li>
            </ul>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">7.2 Prohibited Activities</h4>
            <p className="text-sm">You must NOT:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
              <li>Provide false or misleading information about your practice</li>
              <li>Use the platform for illegal or unauthorized purposes</li>
              <li>Violate any local, state, or national healthcare regulations</li>
              <li>Discriminate against patients based on race, religion, gender, or other protected characteristics</li>
              <li>Attempt to circumvent platform security or access controls</li>
              <li>Scrape, copy, or reverse-engineer any part of the platform</li>
              <li>Use automated bots or scripts to manipulate bookings</li>
            </ul>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">7.3 Account Suspension/Termination</h4>
            <p className="text-sm">
              Veziit.com reserves the right to suspend or terminate your account immediately if you:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2 text-sm">
              <li>Violate these Terms & Conditions</li>
              <li>Engage in fraudulent or illegal activities</li>
              <li>Receive multiple patient complaints about misconduct</li>
              <li>Fail to maintain valid medical licensing</li>
              <li>Abuse or harass patients or platform staff</li>
            </ul>
            <p className="mt-2 text-sm text-red-400">
              <strong>No refunds will be provided for terminated accounts.</strong>
            </p>
          </section>

          {/* 8. Intellectual Property */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">8. Intellectual Property Rights</h3>
            
            <h4 className="text-lg text-emerald-400 mb-2">8.1 Platform Ownership</h4>
            <p className="text-sm">
              All intellectual property rights in the Veziit.com platform, including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2 text-sm">
              <li>Software code and algorithms</li>
              <li>QR code generation technology</li>
              <li>User interface and design</li>
              <li>Branding, logos, and trademarks</li>
              <li>Documentation and content</li>
            </ul>
            <p className="mt-2 text-sm">
              are owned exclusively by Veziit.com. You receive only a limited license to use the platform.
            </p>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">8.2 Doctor Content</h4>
            <p className="text-sm">
              You retain ownership of your practice information, medical content, and patient data. However, by using the platform, you grant Veziit.com a non-exclusive license to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2 text-sm">
              <li>Display your practice information on the platform</li>
              <li>Use anonymized data for analytics and improvements</li>
              <li>Feature your practice in marketing materials (with consent)</li>
            </ul>
          </section>

          {/* 9. Limitation of Liability */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">9. Limitation of Liability</h3>
            
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <p className="text-sm mb-3">
                <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>Veziit.com is NOT liable for any medical malpractice claims</li>
                <li>We are NOT liable for lost revenue due to technical issues</li>
                <li>We are NOT liable for miscommunication between doctors and patients</li>
                <li>We are NOT liable for third-party service failures (Razorpay, Google Cloud, FCM)</li>
                <li>Our total liability is limited to the amount you paid in the last 12 months</li>
                <li>We are NOT liable for indirect, consequential, or punitive damages</li>
              </ul>
              <p className="mt-3 text-sm">
                <strong>The platform is provided "AS IS" without warranties of any kind.</strong>
              </p>
            </div>
          </section>

          {/* 10. Indemnification */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">10. Indemnification</h3>
            <p className="text-sm">
              You agree to indemnify and hold harmless Veziit.com, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-2 text-sm">
              <li>Your use of the platform</li>
              <li>Your medical practice and patient care</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any laws or regulations</li>
              <li>Any patient disputes or medical malpractice claims</li>
              <li>Infringement of third-party intellectual property rights</li>
            </ul>
          </section>

          {/* 11. Modifications to Terms */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">11. Modifications to Terms</h3>
            <p className="text-sm">
              Veziit.com reserves the right to modify these Terms at any time. Changes will be:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2 text-sm">
              <li>Posted on the platform with an updated "Last Modified" date</li>
              <li>Notified via email to your registered address</li>
              <li>Effective 30 days after notification</li>
            </ul>
            <p className="mt-3 text-sm">
              Continued use of the platform after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          {/* 12. Dispute Resolution */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">12. Dispute Resolution & Governing Law</h3>
            
            <h4 className="text-lg text-emerald-400 mb-2">12.1 Governing Law</h4>
            <p className="text-sm">
              These Terms are governed by the laws of <strong>India</strong>. Any disputes will be subject to the exclusive jurisdiction of courts in <strong>[Your City/State]</strong>.
            </p>

            <h4 className="text-lg text-emerald-400 mb-2 mt-4">12.2 Dispute Process</h4>
            <ol className="list-decimal list-inside space-y-2 ml-4 text-sm">
              <li><strong>Contact Support:</strong> Email support@veziit.com with your concern</li>
              <li><strong>Negotiation:</strong> Good faith attempt to resolve the issue within 30 days</li>
              <li><strong>Mediation:</strong> If unresolved, agree to mediation before litigation</li>
              <li><strong>Legal Action:</strong> As a last resort, subject to governing law above</li>
            </ol>
          </section>

          {/* 13. Contact Information */}
          <section>
            <h3 className="text-xl text-emerald-500 mb-3">13. Contact Information</h3>
            <p className="text-sm">
              For questions, concerns, or support regarding these Terms:
            </p>
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 mt-3">
              <p className="text-sm"><strong>Veziit.com</strong></p>
              <p className="text-sm mt-2">Email: <a href="mailto:support@veziit.com" className="text-emerald-500 hover:text-emerald-400">support@veziit.com</a></p>
              <p className="text-sm mt-1 text-gray-400">Response time: Within 2-3 business days</p>
            </div>
          </section>

          {/* Final Acceptance */}
          <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-6 mt-8">
            <p className="text-sm text-center">
              <strong className="text-emerald-400">BY CLICKING "I AGREE" AND REGISTERING ON VEZIIT.COM:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 mt-4 text-sm">
              <li>You confirm that you have read and understood these Terms</li>
              <li>You agree to be legally bound by these Terms</li>
              <li>You acknowledge the NO REFUND policy</li>
              <li>You accept that Veziit.com has NO medical or communication responsibility</li>
              <li>You consent to the advertising revenue sharing program</li>
              <li>You understand all data security and privacy policies</li>
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

