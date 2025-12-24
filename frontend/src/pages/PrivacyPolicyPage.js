import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { pagesAPI } from '../lib/api';

export default function PrivacyPolicyPage() {
  const [page, setPage] = useState({ title: 'Privacy Policy', content: '' });

  useEffect(() => {
    fetchPage();
  }, []);

  const fetchPage = async () => {
    try {
      const response = await pagesAPI.getPrivacyPolicy();
      if (response.data) setPage(response.data);
    } catch (error) {
      console.log('Using default content');
    }
  };

  const defaultContent = `
## Information We Collect

We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support.

### Personal Information
- Name and contact details
- Payment information
- Delivery address
- Phone number for OTP verification

### Automatically Collected Information
- Device and browser information
- IP address
- Usage data and analytics

## How We Use Your Information

We use the information we collect to:
- Process your orders and payments
- Send you order confirmations and updates
- Provide customer support
- Send promotional communications (with your consent)
- Improve our services

## Data Security

We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.

## Your Rights

You have the right to:
- Access your personal data
- Correct inaccurate data
- Delete your data
- Opt-out of marketing communications

## Contact Us

If you have any questions about this Privacy Policy, please contact us through our Contact page.

Last updated: ${new Date().toLocaleDateString('en-IN')}
  `;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12" data-testid="privacy-policy-page">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{page.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
              {page.content || defaultContent}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
