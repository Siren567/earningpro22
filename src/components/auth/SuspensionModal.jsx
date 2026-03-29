import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function SuspensionModal({ email, open, onOpenChange }) {
  const [showContactForm, setShowContactForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: email || '',
    subject: 'Suspended Account Appeal',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContactClick = () => {
    setShowContactForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!formData.message.trim()) {
      setError('Message is required');
      return;
    }

    setLoading(true);

    try {
      const res = await base44.integrations.Core.SendEmail({
        to: 'support@stockpulseai.com',
        subject: `Support Appeal: ${formData.subject}`,
        body: `
Account Suspension Appeal

Name: ${formData.fullName}
Email: ${formData.email}
Subject: ${formData.subject}

Message:
${formData.message}
        `,
        from_name: 'StockPulse AI Support'
      });

      if (res.status === 200 || res.data) {
        toast.success('Your message has been sent to support.');
        setShowContactForm(false);
        setFormData({
          fullName: '',
          email: email || '',
          subject: 'Suspended Account Appeal',
          message: ''
        });
      } else {
        setError('Failed to send message. Please try again.');
      }
    } catch (err) {
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {!showContactForm ? (
          <div className="space-y-6 text-center">
            <div>
              <h2 className="text-2xl font-bold dark:text-white text-gray-900 mb-3">
                Account Suspended
              </h2>
              <p className="dark:text-gray-400 text-gray-600 text-sm">
                Your account has been suspended. If you believe this was done in error, please contact support.
              </p>
            </div>

            <Button
              onClick={handleContactClick}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Contact Support
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Contact Support</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="fullName" className="dark:text-gray-300">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Your full name"
                  className="dark:bg-white/5 dark:border-white/10"
                />
              </div>

              <div>
                <Label htmlFor="supportEmail" className="dark:text-gray-300">Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Your email"
                  className="dark:bg-white/5 dark:border-white/10"
                />
              </div>

              <div>
                <Label htmlFor="subject" className="dark:text-gray-300">Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Subject"
                  className="dark:bg-white/5 dark:border-white/10"
                />
              </div>

              <div>
                <Label htmlFor="message" className="dark:text-gray-300">Message</Label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Describe your situation..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-md border dark:bg-white/5 dark:border-white/10 dark:text-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setShowContactForm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</> : 'Send Message'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}