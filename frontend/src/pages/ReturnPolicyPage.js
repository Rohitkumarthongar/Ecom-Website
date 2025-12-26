import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { pagesAPI } from '../lib/api';

export default function ReturnPolicyPage() {
    const [page, setPage] = useState({ title: 'Return Policy', content: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPage();
    }, []);

    const fetchPage = async () => {
        try {
            const response = await pagesAPI.getReturnPolicy();
            if (response.data) setPage(response.data);
        } catch (error) {
            console.log('Using default content');
        } finally {
            setLoading(false);
        }
    };

    const defaultContent = `
## Return & Refund Policy

We want you to be completely satisfied with your purchase. If you're not happy with your order, we're here to help.

### Returns

You have **7 calendar days** to return an item from the date you received it.

To be eligible for a return:
- Your item must be unused and in the same condition that you received it.
- Your item must be in the original packaging.
- Your item needs to have the receipt or proof of purchase.

### Refunds

Once we receive your item, we will inspect it and notify you that we have received your returned item. We will immediately notify you on the status of your refund after inspecting the item.

If your return is approved, we will initiate a refund to your credit card (or original method of payment). You will receive the credit within a certain amount of days, depending on your card issuer's policies.

### Shipping

You will be responsible for paying for your own shipping costs for returning your item. Shipping costs are non-refundable. If you receive a refund, the cost of return shipping will be deducted from your refund.

### Contact Us

If you have any questions on how to return your item to us, contact us.
  `;

    return (
        <div className="max-w-4xl mx-auto px-4 py-12" data-testid="return-policy-page">
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
