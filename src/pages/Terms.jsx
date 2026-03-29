import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Terms() {
  return (
    <div className="min-h-screen dark:bg-[#0a0a0f] bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>

        <div className="dark:bg-[#1a1a2e] bg-white rounded-2xl shadow-xl border dark:border-white/10 border-gray-200 p-8 md:p-12">
          <h1 className="text-4xl font-bold dark:text-white text-gray-900 mb-4">
            Terms of Service
          </h1>
          <p className="text-sm dark:text-gray-400 text-gray-600 mb-8">
            Last Updated: March 13, 2026
          </p>

          <div className="space-y-8 dark:text-gray-300 text-gray-700">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-semibold dark:text-white text-gray-900 mb-3">
                1. Introduction
              </h2>
              <p className="leading-relaxed">
                Welcome to StockPulse AI ("Platform", "we", "us", or "our"). By accessing or using our platform, 
                you agree to be bound by these Terms of Service. If you do not agree to these terms, 
                please do not use our platform.
              </p>
            </section>

            {/* Use of the Platform */}
            <section>
              <h2 className="text-2xl font-semibold dark:text-white text-gray-900 mb-3">
                2. Use of the Platform
              </h2>
              <p className="leading-relaxed mb-3">
                You agree to use the Platform only for lawful purposes and in accordance with these Terms. 
                You are responsible for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Ensuring that your use complies with all applicable laws and regulations</li>
                <li>Not attempting to gain unauthorized access to any part of the Platform</li>
              </ul>
            </section>

            {/* No Financial Advice */}
            <section className="border-l-4 border-amber-500 pl-6 bg-amber-500/5 py-4 rounded-r-lg">
              <h2 className="text-2xl font-semibold dark:text-white text-gray-900 mb-3">
                3. No Financial Advice
              </h2>
              <div className="space-y-3 leading-relaxed">
                <p className="font-semibold text-amber-600 dark:text-amber-400">
                  IMPORTANT LEGAL DISCLAIMER
                </p>
                <p>
                  This platform provides financial data, analytics, and informational tools only. 
                  <strong> The platform does NOT provide financial advice, investment advice, trading advice, 
                  or recommendations to buy or sell securities.</strong>
                </p>
                <p>
                  All information presented on the platform, including but not limited to AI-generated scores, 
                  risk classifications, stock analyses, earnings predictions, and market data, is for 
                  <strong> informational and educational purposes only.</strong>
                </p>
                <p>
                  <strong>Users are solely responsible for their investment decisions.</strong> Any investment 
                  or trading decision you make is entirely at your own risk. You should conduct your own research, 
                  perform your own due diligence, and consult with qualified financial advisors before making any 
                  investment decisions.
                </p>
                <p>
                  <strong>The platform owners, operators, and affiliates are not liable for any financial losses, 
                  damages, or consequences resulting from the use of the platform or reliance on any information 
                  provided herein.</strong>
                </p>
                <p>
                  Past performance is not indicative of future results. All investments carry risk, including 
                  the potential loss of principal.
                </p>
              </div>
            </section>

            {/* User Responsibilities */}
            <section>
              <h2 className="text-2xl font-semibold dark:text-white text-gray-900 mb-3">
                4. User Responsibilities
              </h2>
              <p className="leading-relaxed mb-3">
                As a user of the Platform, you agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide accurate and complete information when creating an account</li>
                <li>Maintain the security of your account credentials</li>
                <li>Promptly notify us of any unauthorized use of your account</li>
                <li>Use the Platform in compliance with all applicable laws and regulations</li>
                <li>Not use the Platform for any illegal or unauthorized purpose</li>
                <li>Not interfere with or disrupt the Platform's operation</li>
              </ul>
            </section>

            {/* Data and Privacy */}
            <section>
              <h2 className="text-2xl font-semibold dark:text-white text-gray-900 mb-3">
                5. Data and Privacy
              </h2>
              <p className="leading-relaxed">
                We collect and process personal data in accordance with our Privacy Policy. By using the Platform, 
                you consent to such collection and processing. We implement reasonable security measures to protect 
                your data, but cannot guarantee absolute security. You are responsible for maintaining the 
                confidentiality of your account information.
              </p>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-2xl font-semibold dark:text-white text-gray-900 mb-3">
                6. Limitation of Liability
              </h2>
              <p className="leading-relaxed mb-3">
                To the maximum extent permitted by law:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>The Platform is provided "as is" without warranties of any kind</li>
                <li>We do not warrant that the Platform will be uninterrupted, error-free, or secure</li>
                <li>We are not liable for any indirect, incidental, special, or consequential damages</li>
                <li>We are not liable for any financial losses resulting from investment decisions made using the Platform</li>
                <li>Our total liability shall not exceed the amount you paid for access to the Platform in the last 12 months</li>
              </ul>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="text-2xl font-semibold dark:text-white text-gray-900 mb-3">
                7. Changes to the Terms
              </h2>
              <p className="leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify users of significant changes 
                by posting a notice on the Platform or sending an email notification. Your continued use of the 
                Platform after such modifications constitutes your acceptance of the updated Terms.
              </p>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-2xl font-semibold dark:text-white text-gray-900 mb-3">
                8. Contact Information
              </h2>
              <p className="leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="mt-4 p-4 dark:bg-white/5 bg-gray-50 rounded-lg">
                <p className="font-medium">StockPulse AI Support</p>
                <p className="text-sm dark:text-gray-400 text-gray-600 mt-1">
                  Email: legal@stockpulseai.com
                </p>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t dark:border-white/10 border-gray-200">
            <p className="text-sm dark:text-gray-500 text-gray-600 text-center">
              By using StockPulse AI, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}