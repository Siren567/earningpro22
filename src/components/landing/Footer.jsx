import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Footer() {
  const { t } = useLanguage();
  const [showContact, setShowContact] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [contactForm, setContactForm] = useState({ fullName: '', email: '', subject: '', message: '' });
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState('');

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactError('');

    if (!contactForm.fullName || !contactForm.email || !contactForm.subject || !contactForm.message) {
      setContactError('All fields are required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email)) {
      setContactError('Please enter a valid email address');
      return;
    }

    setContactSuccess(true);
    setTimeout(() => {
      setShowContact(false);
      setContactSuccess(false);
      setContactForm({ fullName: '', email: '', subject: '', message: '' });
    }, 2000);
  };

  return (
    <footer className="dark:bg-[#080810] bg-white border-t dark:border-white/5 border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold dark:text-white text-gray-900">
              StockPulse<span className="text-blue-500">AI</span>
            </span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm dark:text-gray-500 text-gray-500">
            <button onClick={() => setShowTerms(true)} className="hover:text-blue-500 transition-colors">{t('footer_terms')}</button>
            <button onClick={() => setShowPrivacy(true)} className="hover:text-blue-500 transition-colors">{t('footer_privacy')}</button>
            <a href="#" className="hover:text-blue-500 transition-colors">{t('footer_sitemap')}</a>
            <button onClick={() => setShowContact(true)} className="hover:text-blue-500 transition-colors">{t('footer_contact')}</button>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t dark:border-white/5 border-gray-200 text-center">
          <p className="text-xs dark:text-gray-600 text-gray-400">{t('footer_credits')}</p>
        </div>
      </div>

      {/* Contact Modal */}
      <Dialog open={showContact} onOpenChange={setShowContact}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contact Us</DialogTitle>
          </DialogHeader>
          {contactSuccess ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-semibold dark:text-white text-gray-900">Message Sent!</p>
              <p className="text-sm dark:text-gray-400 text-gray-600 mt-2">We'll get back to you soon.</p>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={contactForm.fullName}
                  onChange={(e) => setContactForm({ ...contactForm, fullName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  rows={5}
                  required
                />
              </div>
              {contactError && (
                <p className="text-sm text-red-500">{contactError}</p>
              )}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                Send Message
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Terms of Service Modal */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4 text-sm dark:text-gray-300 text-gray-700">
            <p className="text-xs dark:text-gray-400 text-gray-600">Last updated: 2026</p>
            
            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Introduction</h3>
              <p>Welcome to this platform. By accessing or using this website and its services, you agree to comply with and be bound by these Terms of Service. If you do not agree with these terms, please do not use the platform.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Use of the Platform</h3>
              <p>This platform provides tools, analytics, market data, earnings-related information, watchlists, alerts, and other informational resources related to stocks and financial markets. The platform is intended for informational, educational, and research purposes only.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Eligibility</h3>
              <p>By using this platform, you confirm that you are legally permitted to use the service under the laws applicable to you.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">No Financial Advice</h3>
              <p className="mb-3">
                <span className="font-extrabold px-1 py-0.5 rounded" style={{ backgroundColor: '#FFF3A0' }}>THIS PLATFORM DOES NOT PROVIDE FINANCIAL OR INVESTMENT ADVICE.</span>
              </p>
              <p className="mb-3">The information provided on this platform does not constitute financial advice, investment advice, trading advice, legal advice, tax advice, or any recommendation to buy, sell, or hold any security or financial instrument.</p>
              <p className="mb-3">All data, scores, alerts, rankings, analytics, indicators, watchlists, and other information are provided strictly for informational and educational purposes only.</p>
              <p className="mb-3">Users are solely responsible for their own financial decisions, trades, investments, and risk management.</p>
              <p>You should consult a qualified financial advisor or other licensed professional before making investment or financial decisions.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Market Data Disclaimer</h3>
              <p>Market data, financial metrics, earnings information, analytics, and news displayed on this platform may be provided by third-party sources. We do not guarantee that such data is accurate, complete, current, uninterrupted, or error-free. Delays, omissions, and inaccuracies may occur.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">User Responsibility</h3>
              <p>You are solely responsible for your use of the platform and for any actions you take based on the information provided. You agree not to misuse the service, interfere with the platform, attempt unauthorized access, or use the platform for unlawful purposes.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Accounts and Credentials</h3>
              <p>Users are responsible for maintaining the confidentiality of their login credentials and for all activity that occurs under their accounts.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Limitation of Liability</h3>
              <p className="mb-3">To the fullest extent permitted by law, the platform, its owners, operators, developers, affiliates, and service providers shall not be liable for any direct, indirect, incidental, consequential, special, exemplary, or financial damages, including trading losses, investment losses, lost profits, or losses resulting from reliance on data or platform functionality.</p>
              <p>Use of the platform is entirely at your own risk.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Availability of Service</h3>
              <p>We do not guarantee that the platform will always be available, uninterrupted, secure, or free from bugs or errors. Features, data sources, and services may be modified, suspended, or discontinued at any time.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Changes to the Terms</h3>
              <p>We reserve the right to update or modify these Terms of Service at any time. Continued use of the platform after changes are posted constitutes acceptance of the updated terms.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Contact</h3>
              <p>If you have any questions regarding these Terms of Service, please contact us through the Contact form available on the platform.</p>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Modal */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4 text-sm dark:text-gray-300 text-gray-700">
            <p className="text-xs dark:text-gray-400 text-gray-600">Last updated: 2026</p>
            
            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Introduction</h3>
              <p>This Privacy Policy explains how we collect, use, store, and protect user information when using this platform.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Information We Collect</h3>
              <p>We may collect information such as:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>name</li>
                <li>email address</li>
                <li>account credentials</li>
                <li>profile settings</li>
                <li>subscription details</li>
                <li>usage data</li>
                <li>device or browser-related technical data</li>
                <li>platform interaction data</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">How We Use Information</h3>
              <p>We may use collected information to:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>create and manage user accounts</li>
                <li>authenticate users</li>
                <li>operate and improve platform functionality</li>
                <li>personalize user experience</li>
                <li>send service-related notifications</li>
                <li>maintain security and prevent misuse</li>
                <li>analyze performance and usage patterns</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Account Security</h3>
              <p>Passwords must be stored securely using hashing and must never be stored in plain text.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Data Protection</h3>
              <p>We implement reasonable technical and organizational measures to protect personal information. However, no internet-based system or storage solution can be guaranteed to be completely secure.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Third-Party Services</h3>
              <p className="mb-2">This platform may use third-party providers and APIs for services such as:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>market data</li>
                <li>analytics</li>
                <li>infrastructure</li>
                <li>notifications</li>
                <li>authentication-related functionality</li>
              </ul>
              <p className="mt-2">These third parties may process certain information as necessary for the platform to function.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Cookies and Sessions</h3>
              <p>The platform may use cookies, session tokens, and similar technologies to maintain login sessions, remember preferences, and improve user experience.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">User Rights</h3>
              <p>Where applicable, users may request access to, correction of, or deletion of their account information by contacting the platform through the Contact form.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Data Retention</h3>
              <p>We may retain account and usage information for as long as reasonably necessary to provide the service, comply with legal obligations, resolve disputes, and enforce platform policies.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Policy Updates</h3>
              <p>We may update this Privacy Policy from time to time. Continued use of the platform after updates are posted constitutes acceptance of the revised policy.</p>
            </section>

            <section>
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Contact</h3>
              <p>If you have any questions about this Privacy Policy, please contact us through the Contact form on the platform.</p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </footer>
  );
}