import { ArrowLeft, AlertTriangle } from 'lucide-react';
import healqrLogo from '../assets/healqr-logo.png';

interface RefundPolicyProps {
  onBack: () => void;
}

export default function RefundPolicy({ onBack }: RefundPolicyProps) {
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
        <h1 className="text-4xl mb-8 text-emerald-500">Refund Policy</h1>
        
        {/* Important Notice Banner */}
        <div className="bg-red-900/20 border-2 border-red-500 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl text-red-500 mb-2">IMPORTANT: NO REFUND POLICY</h2>
              <p className="text-white">
                All payments made to HealQR.com for subscriptions, services, and add-ons are <strong className="text-red-500">FINAL and NON-REFUNDABLE</strong> under any circumstances. Please read this policy carefully before making any payment.
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-6 text-gray-300">
          <p className="text-sm text-gray-400">
            <strong>Effective Date:</strong> November 1, 2025
          </p>
          <p className="text-sm text-gray-400">
            <strong>Last Updated:</strong> November 1, 2025
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">1. No Refund Policy Overview</h2>
            <p>
              HealQR.com operates a strict <strong>NO REFUND</strong> policy. By subscribing to any of our services or making any payment on our platform, you acknowledge and agree that:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>All payments are final and non-refundable</strong></li>
              <li>No refunds will be provided for any reason, including but not limited to:
                <ul className="list-disc list-inside space-y-1 ml-8 mt-2">
                  <li>Cancellation of subscription</li>
                  <li>Unused services or features</li>
                  <li>Partial billing periods</li>
                  <li>Change of mind or dissatisfaction</li>
                  <li>Technical issues or service interruptions</li>
                  <li>Account termination or suspension</li>
                  <li>Duplicate payments or billing errors</li>
                  <li>Non-utilization of bookings or credits</li>
                </ul>
              </li>
              <li>This policy applies to all payment types and methods</li>
              <li>This policy is binding and enforceable under applicable law</li>
            </ul>
            <p className="mt-4 text-yellow-500">
              <strong>PLEASE READ AND UNDERSTAND THIS POLICY BEFORE MAKING ANY PAYMENT.</strong> We recommend carefully reviewing our subscription plans and features before purchasing.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">2. Scope of Non-Refundable Payments</h2>
            <p>
              The following payments are non-refundable under all circumstances:
            </p>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">2.1 Subscription Fees</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Monthly Subscriptions:</strong> Scale Plan (₹1,999/month), Pro Plan (₹2,999/month)</li>
              <li><strong>Annual Subscriptions:</strong> Scale Plan (₹19,999/year), Pro Plan (₹29,999/year)</li>
              <li>Fees are charged in advance and are non-refundable regardless of usage</li>
              <li>Cancellation does not entitle you to a refund for the current billing period</li>
              <li>Pro-rated refunds are NOT provided for partial months or early cancellation</li>
            </ul>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">2.2 Add-On Services</h3>
            <p>
              All add-on services purchased are non-refundable, including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Mini-Website Generator:</strong> ₹299/month or ₹2,999/year</li>
              <li><strong>WhatsApp Notification Integration:</strong> ₹299/month or ₹2,999/year</li>
              <li><strong>Chat Support:</strong> ₹299/month or ₹2,999/year</li>
              <li><strong>Predictive Booking Insights:</strong> ₹299/month or ₹2,999/year</li>
              <li><strong>E-commerce Activation:</strong> ₹799/month or ₹7,999/year</li>
              <li><strong>AI-Powered RX Reader:</strong> ₹799/month or ₹7,999/year</li>
              <li>Any other add-on services or features</li>
            </ul>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">2.3 Top-Up Vault Credits</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>All Top-Up Vault credits purchased are <strong>non-refundable</strong></li>
              <li>Unused credits cannot be refunded or converted to cash</li>
              <li>Credits remain valid only while your account is active</li>
              <li>Credits expire upon account closure or termination</li>
            </ul>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">2.4 Setup and Processing Fees</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Any setup fees, processing fees, or administrative charges are non-refundable</li>
              <li>Payment gateway charges (including Razorpay fees) are non-refundable</li>
              <li>GST and other taxes paid are non-refundable</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">3. Specific No-Refund Scenarios</h2>
            
            <h3 className="text-xl text-emerald-500 mt-6 mb-3">3.1 Subscription Cancellation</h3>
            <p>
              When you cancel your subscription:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Your subscription will remain active until the end of the current billing period</li>
              <li><strong>No refund will be provided</strong> for the remaining days/months of your subscription</li>
              <li>You will continue to have access to paid features until the billing period ends</li>
              <li>Automatic renewal will be disabled, and you will not be charged for subsequent periods</li>
            </ul>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">3.2 Account Termination by HealQR</h3>
            <p>
              If we terminate your account for violation of our Terms of Service:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>No refunds will be provided</strong> for any remaining subscription period</li>
              <li>All payments made are forfeited</li>
              <li>Top-Up Vault credits will be forfeited</li>
              <li>Access to all services will be immediately revoked</li>
            </ul>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">3.3 Technical Issues or Service Interruptions</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Temporary service outages or technical issues do not entitle you to a refund</li>
              <li>We will make reasonable efforts to restore service promptly</li>
              <li>Extended outages may result in service credits at our sole discretion, but not cash refunds</li>
            </ul>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">3.4 Duplicate or Erroneous Payments</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>While duplicate payments made in error may be eligible for refund consideration</li>
              <li>Such cases will be reviewed on a case-by-case basis within 7 days of the transaction</li>
              <li>You must provide proof of duplicate payment</li>
              <li>Refunds for genuine errors are at our sole discretion and may take 7-14 business days to process</li>
              <li>Payment gateway fees are non-refundable even in case of duplicate payments</li>
            </ul>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">3.5 Change of Mind</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>No refunds will be provided if you change your mind after purchase</li>
              <li>You are responsible for understanding the features and limitations of each plan before purchasing</li>
              <li>We encourage you to use the free Starter plan to evaluate our services before upgrading</li>
            </ul>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">3.6 Non-Utilization of Services</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Failure to use purchased services does not entitle you to a refund</li>
              <li>Unused booking credits cannot be refunded</li>
              <li>It is your responsibility to utilize the services during the subscription period</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">4. Payment Gateway Compliance</h2>
            
            <h3 className="text-xl text-emerald-500 mt-6 mb-3">4.1 Razorpay Integration</h3>
            <p>
              We use Razorpay as our payment gateway. This policy complies with Razorpay's merchant requirements:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Our refund policy is clearly disclosed before payment</li>
              <li>Users must accept this policy as part of the checkout process</li>
              <li>All transactions are processed securely through Razorpay</li>
              <li>Payment disputes are handled in accordance with Razorpay's dispute resolution process</li>
            </ul>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">4.2 Chargeback Prevention</h3>
            <p>
              Initiating a chargeback or payment dispute with your bank or card issuer:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Violates these terms and may result in immediate account termination</li>
              <li>May result in legal action to recover costs and fees</li>
              <li>Should only be done in cases of genuine fraud or unauthorized transactions</li>
              <li>We reserve the right to contest all chargebacks</li>
            </ul>
            <p className="mt-4 text-yellow-500">
              <strong>IMPORTANT:</strong> If you have concerns about a charge, please contact our support team at <a href="mailto:support@veziit.com" className="text-emerald-500 hover:text-emerald-400">support@veziit.com</a> before initiating a chargeback.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">5. Exceptions and Special Circumstances</h2>
            
            <h3 className="text-xl text-emerald-500 mt-6 mb-3">5.1 Genuine Technical Errors</h3>
            <p>
              In extremely rare cases where a genuine technical error on our platform results in incorrect charges:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>We may, at our sole discretion, issue a refund</li>
              <li>You must report the error within 7 days of the transaction</li>
              <li>You must provide supporting evidence and documentation</li>
              <li>Our investigation findings will be final and binding</li>
            </ul>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">5.2 Fraudulent Transactions</h3>
            <p>
              If you believe your payment method was used fraudulently:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Contact us immediately at <a href="mailto:support@veziit.com" className="text-emerald-500 hover:text-emerald-400">support@veziit.com</a></li>
              <li>File a police report and provide us with a copy</li>
              <li>Cooperate with our fraud investigation</li>
              <li>Refunds for confirmed fraud will be processed in accordance with applicable law</li>
            </ul>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">5.3 Service Credits (Not Cash Refunds)</h3>
            <p>
              In exceptional circumstances, we may offer service credits instead of cash refunds:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Service credits can only be used for future Veziit services</li>
              <li>Credits cannot be transferred, sold, or converted to cash</li>
              <li>Credits expire if not used within the specified period</li>
              <li>The decision to offer credits is at our sole discretion</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">6. Subscription Management and Billing</h2>
            
            <h3 className="text-xl text-emerald-500 mt-6 mb-3">6.1 Automatic Renewal</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Subscriptions automatically renew at the end of each billing period</li>
              <li>You will be charged the then-current subscription rate</li>
              <li>To avoid charges, you must cancel before the renewal date</li>
              <li>Cancellation can be done through your account settings</li>
              <li><strong>No refunds for automatic renewals that you forgot to cancel</strong></li>
            </ul>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">6.2 Plan Upgrades</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>When upgrading, you will be charged the difference for the remainder of your billing period</li>
              <li>Upgraded plans take effect immediately</li>
              <li>Upgrade charges are non-refundable</li>
            </ul>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">6.3 Plan Downgrades</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Downgrades take effect at the end of your current billing period</li>
              <li><strong>No refunds or credits</strong> for the difference between plans</li>
              <li>You retain access to higher-tier features until the billing period ends</li>
            </ul>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">6.4 Free Trial Conversions</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>The Starter plan is free with limitations (100 bookings / 10 days)</li>
              <li>Upgrading from the free plan to a paid plan is non-refundable</li>
              <li>Ensure you understand paid plan features before upgrading</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">7. Taxes and Government Charges</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>All prices are exclusive of applicable taxes unless stated otherwise</li>
              <li>GST (Goods and Services Tax) and other government charges are added to your invoice</li>
              <li>Taxes paid are non-refundable under all circumstances</li>
              <li>Tax rates may change based on government regulations</li>
              <li>You are responsible for any additional taxes applicable in your jurisdiction</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">8. Customer Responsibilities</h2>
            <p>
              Before making any payment, you are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Reading and understanding this Refund Policy in full</strong></li>
              <li>Reviewing our Terms of Service and Privacy Policy</li>
              <li>Understanding the features, limitations, and pricing of your chosen plan</li>
              <li>Ensuring your payment information is accurate</li>
              <li>Verifying that you have selected the correct plan before payment</li>
              <li>Managing your subscription settings and renewal dates</li>
              <li>Cancelling your subscription before renewal if you wish to discontinue service</li>
              <li>Contacting support if you have questions before purchasing</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">9. Dispute Resolution Process</h2>
            <p>
              If you have concerns about a payment or billing issue:
            </p>
            <ol className="list-decimal list-inside space-y-3 ml-4">
              <li>
                <strong>Contact Support First:</strong> Email <a href="mailto:support@veziit.com" className="text-emerald-500 hover:text-emerald-400">support@veziit.com</a> with your concern
              </li>
              <li>
                <strong>Provide Details:</strong> Include your account information, transaction ID, and description of the issue
              </li>
              <li>
                <strong>Allow Investigation Time:</strong> We will investigate within 7-14 business days
              </li>
              <li>
                <strong>Receive Our Decision:</strong> We will communicate our findings and decision in writing
              </li>
              <li>
                <strong>Final Decision:</strong> Our decision on billing disputes is final, subject to applicable consumer protection laws
              </li>
            </ol>
            <p className="mt-4 text-yellow-500">
              <strong>DO NOT initiate chargebacks before contacting our support team.</strong> We are committed to resolving genuine issues fairly.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">10. Legal Compliance</h2>
            
            <h3 className="text-xl text-emerald-500 mt-6 mb-3">10.1 Consumer Protection Laws</h3>
            <p>
              This policy complies with applicable consumer protection laws in India, including:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Consumer Protection Act, 2019</li>
              <li>Information Technology Act, 2000</li>
              <li>Razorpay payment gateway merchant requirements</li>
              <li>RBI (Reserve Bank of India) guidelines for digital payments</li>
            </ul>

            <h3 className="text-xl text-emerald-500 mt-6 mb-3">10.2 Disclosure Requirements</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>This policy is clearly displayed on our website and during checkout</li>
              <li>You must acknowledge acceptance before completing payment</li>
              <li>We maintain records of policy acceptance for all transactions</li>
              <li>Changes to this policy will be communicated with adequate notice</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">11. Policy Changes</h2>
            <p>
              We reserve the right to modify this Refund Policy at any time. Changes will be effective upon posting to our website. Material changes will be communicated via:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Email notification to registered users</li>
              <li>In-app notification</li>
              <li>Updated "Last Updated" date on this page</li>
            </ul>
            <p className="mt-4">
              Continued use of our services after policy changes constitutes acceptance of the updated policy. Payments made under the previous policy remain subject to that policy's terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl text-white mt-8 mb-4">12. Contact Information</h2>
            <p>
              For questions, concerns, or disputes regarding payments and refunds, please contact:
            </p>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mt-4">
              <p><strong>Veziit.com</strong></p>
              <p className="mt-3">
                <strong>Email:</strong><br />
                <a href="mailto:support@veziit.com" className="text-emerald-500 hover:text-emerald-400">support@veziit.com</a>
              </p>
              <p className="mt-4 text-sm text-gray-400">
                Response time: Within 2-3 business days for billing inquiries<br />
                Investigation time: 7-14 business days for disputes
              </p>
            </div>
          </section>

          <section className="space-y-4 mt-12 pt-8 border-t border-zinc-800">
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
              <h3 className="text-xl text-red-500 mb-4">Final Acknowledgment</h3>
              <p className="text-white mb-4">
                By making any payment on Veziit.com, you explicitly acknowledge that:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-white">
                <li>You have read and fully understand this Refund Policy</li>
                <li>You agree that all payments are FINAL and NON-REFUNDABLE</li>
                <li>You accept that NO REFUNDS will be provided under any circumstances, except as explicitly stated in Section 5</li>
                <li>You waive any right to dispute or claim refunds beyond the terms stated herein</li>
                <li>You understand this policy is legally binding and enforceable</li>
              </ul>
              <p className="text-yellow-500 mt-4">
                <strong>IF YOU DO NOT AGREE WITH THIS POLICY, DO NOT MAKE ANY PAYMENT OR USE PAID SERVICES.</strong>
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 px-6 mt-12">
        <div className="container mx-auto max-w-7xl text-center text-gray-400 text-sm">
          <p>© 2025 Veziit.com. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}