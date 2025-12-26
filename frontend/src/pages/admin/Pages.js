import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { pagesAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Save, FileText } from 'lucide-react';

export default function AdminPages() {
  const [privacyPolicy, setPrivacyPolicy] = useState({ title: 'Privacy Policy', content: '' });
  const [terms, setTerms] = useState({ title: 'Terms of Service', content: '' });
  const [returnPolicy, setReturnPolicy] = useState({ title: 'Return Policy', content: '' });
  const [contact, setContact] = useState({ title: 'Contact Us', content: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const privacyRes = await pagesAPI.getPrivacyPolicy();
      if (privacyRes.data) setPrivacyPolicy(privacyRes.data);

      const termsRes = await pagesAPI.getTerms();
      if (termsRes.data) setTerms(termsRes.data);

      const returnsRes = await pagesAPI.getReturnPolicy();
      if (returnsRes.data) setReturnPolicy(returnsRes.data);

      const contactRes = await pagesAPI.getContact();
      if (contactRes.data) setContact(contactRes.data);
    } catch (error) {
      console.log('Using default pages');
    }
  };

  const handleSave = async (slug, data) => {
    setSaving(true);
    try {
      await pagesAPI.updatePage(slug, data);
      toast.success('Page updated successfully');
    } catch (error) {
      toast.error('Failed to update page');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-pages">
      <div>
        <h1 className="text-2xl font-bold">Page Management</h1>
        <p className="text-slate-400">Edit static pages content</p>
      </div>

      <Tabs defaultValue="privacy">
        <TabsList className="bg-slate-800">
          <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
          <TabsTrigger value="terms">Terms of Service</TabsTrigger>
          <TabsTrigger value="contact">Contact Us</TabsTrigger>
          <TabsTrigger value="returns">Return Policy</TabsTrigger>
        </TabsList>

        <TabsContent value="privacy">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Privacy Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={privacyPolicy.title}
                  onChange={(e) => setPrivacyPolicy({ ...privacyPolicy, title: e.target.value })}
                  className="input-admin"
                />
              </div>
              <div className="space-y-2">
                <Label>Content (Markdown supported)</Label>
                <Textarea
                  value={privacyPolicy.content}
                  onChange={(e) => setPrivacyPolicy({ ...privacyPolicy, content: e.target.value })}
                  className="input-admin min-h-[400px] font-mono"
                  placeholder="Enter your privacy policy content here..."
                />
              </div>
              <Button
                onClick={() => handleSave('privacy-policy', privacyPolicy)}
                disabled={saving}
                className="bg-primary hover:bg-primary/90"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Terms of Service
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={terms.title}
                  onChange={(e) => setTerms({ ...terms, title: e.target.value })}
                  className="input-admin"
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={terms.content}
                  onChange={(e) => setTerms({ ...terms, content: e.target.value })}
                  className="input-admin min-h-[400px] font-mono"
                  placeholder="Enter your terms of service content here..."
                />
              </div>
              <Button
                onClick={() => handleSave('terms', terms)}
                disabled={saving}
                className="bg-primary hover:bg-primary/90"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Contact Us Page
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Additional Content</Label>
                <Textarea
                  value={contact.content}
                  onChange={(e) => setContact({ ...contact, content: e.target.value })}
                  className="input-admin min-h-[200px] font-mono"
                  placeholder="Additional contact information..."
                />
              </div>
              <p className="text-sm text-slate-400">
                Note: Contact details (phone, email, address) are pulled from Settings.
              </p>
              <Button
                onClick={() => handleSave('contact', contact)}
                disabled={saving}
                className="bg-primary hover:bg-primary/90"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="returns">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Return Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={returnPolicy.title}
                  onChange={(e) => setReturnPolicy({ ...returnPolicy, title: e.target.value })}
                  className="input-admin"
                />
              </div>
              <div className="space-y-2">
                <Label>Content (Markdown supported)</Label>
                <Textarea
                  value={returnPolicy.content}
                  onChange={(e) => setReturnPolicy({ ...returnPolicy, content: e.target.value })}
                  className="input-admin min-h-[400px] font-mono"
                  placeholder="Enter your return policy content here..."
                />
              </div>
              <Button
                onClick={() => handleSave('return-policy', returnPolicy)}
                disabled={saving}
                className="bg-primary hover:bg-primary/90"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
