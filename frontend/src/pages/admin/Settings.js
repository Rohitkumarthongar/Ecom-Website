import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { SingleImageUpload } from '../../components/ui/image-upload';
import { settingsAPI } from '../../lib/api';
import { getImageUrl } from '../../lib/utils';
import { toast } from 'sonner';
import { Save, Building2, Image, Share2, CreditCard, Mail, TestTube, AlertCircle, CheckCircle, Info } from 'lucide-react';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    business_name: '',
    company_name: '',
    gst_number: '',
    phone: '',
    email: '',
    address: { line1: '', line2: '', city: '', state: '', pincode: '' },
    enable_gst_billing: true,
    default_gst_rate: '18',
    invoice_prefix: 'INV',
    order_prefix: 'ORD',
    logo_url: '',
    favicon_url: '',
    facebook_url: '',
    instagram_url: '',
    twitter_url: '',
    youtube_url: '',
    whatsapp_number: '',
    upi_id: '',
  });
  const [emailSettings, setEmailSettings] = useState({
    email_enabled: false,
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_username: '',
    smtp_from_email: '',
    smtp_from_name: 'Amorlias Support',
    smtp_password_configured: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchEmailSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.get();
      if (response.data) {
        setSettings({
          ...settings,
          ...response.data,
          address: { ...settings.address, ...response.data.address },
          default_gst_rate: String(response.data.default_gst_rate || 18),
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailSettings = async () => {
    try {
      const response = await settingsAPI.getEmailSettings();
      if (response.data) {
        setEmailSettings(response.data);
        setTestEmail(response.data.smtp_from_email || '');
      }
    } catch (error) {
      console.error('Failed to fetch email settings:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.update({
        ...settings,
        default_gst_rate: parseFloat(settings.default_gst_rate),
      });
      toast.success('Settings saved successfully');
      
      // Trigger settings update event for AdminLayout
      window.dispatchEvent(new CustomEvent('settingsUpdated'));
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address to test');
      return;
    }
    
    setTestingEmail(true);
    try {
      const response = await settingsAPI.testEmail({ email: testEmail });
      toast.success(`Email test completed! ${response.data.note}`);
    } catch (error) {
      toast.error('Failed to test email functionality');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleAddressChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
        <div className="h-64 bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-settings">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-slate-400">Configure your store settings</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="bg-slate-800">
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="social">Social & Links</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
        </TabsList>

        {/* Business Details Tab */}
        <TabsContent value="business">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Business Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input
                    value={settings.business_name}
                    onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                    placeholder="Your Business Name"
                    className="input-admin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={settings.company_name}
                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                    placeholder="Company Name for Invoices & Labels"
                    className="input-admin"
                  />
                  <p className="text-xs text-slate-400">This name will appear on invoices and shipping labels</p>
                </div>
                <div className="space-y-2">
                  <Label>GST Number</Label>
                  <Input
                    value={settings.gst_number}
                    onChange={(e) => setSettings({ ...settings, gst_number: e.target.value.toUpperCase() })}
                    placeholder="e.g., 29ABCDE1234F1Z5"
                    className="input-admin"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      placeholder="+91 9876543210"
                      className="input-admin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={settings.email}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      placeholder="business@example.com"
                      className="input-admin"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle>Business Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Address Line 1</Label>
                  <Input
                    value={settings.address.line1}
                    onChange={(e) => handleAddressChange('line1', e.target.value)}
                    placeholder="Building, Street"
                    className="input-admin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address Line 2</Label>
                  <Input
                    value={settings.address.line2}
                    onChange={(e) => handleAddressChange('line2', e.target.value)}
                    placeholder="Area, Landmark"
                    className="input-admin"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={settings.address.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      placeholder="City"
                      className="input-admin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input
                      value={settings.address.state}
                      onChange={(e) => handleAddressChange('state', e.target.value)}
                      placeholder="State"
                      className="input-admin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode</Label>
                    <Input
                      value={settings.address.pincode}
                      onChange={(e) => handleAddressChange('pincode', e.target.value)}
                      placeholder="Pincode"
                      className="input-admin"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Logo</Label>
                    <SingleImageUpload
                      value={settings.logo_url}
                      onChange={(imageUrl) => setSettings({ ...settings, logo_url: imageUrl })}
                      folder="branding"
                      imageType="logo"
                      label=""
                      description="Upload logo (any size - will be optimized to 400x120 max, aspect ratio preserved)"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Favicon</Label>
                    <SingleImageUpload
                      value={settings.favicon_url}
                      onChange={(imageUrl) => setSettings({ ...settings, favicon_url: imageUrl })}
                      folder="branding"
                      imageType="favicon"
                      label=""
                      description="Upload favicon (any size - will be optimized to 32x32 pixels)"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle>Billing & Invoice Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div>
                  <Label>Enable GST Billing</Label>
                  <p className="text-sm text-slate-400">Show GST breakdown on invoices</p>
                </div>
                <Switch
                  checked={settings.enable_gst_billing}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_gst_billing: checked })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Default GST Rate (%)</Label>
                  <Input
                    type="number"
                    value={settings.default_gst_rate}
                    onChange={(e) => setSettings({ ...settings, default_gst_rate: e.target.value })}
                    placeholder="18"
                    className="input-admin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Invoice Prefix</Label>
                  <Input
                    value={settings.invoice_prefix}
                    onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value.toUpperCase() })}
                    placeholder="INV"
                    className="input-admin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Order Prefix</Label>
                  <Input
                    value={settings.order_prefix}
                    onChange={(e) => setSettings({ ...settings, order_prefix: e.target.value.toUpperCase() })}
                    placeholder="ORD"
                    className="input-admin"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Configuration Tab */}
        <TabsContent value="email">
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Configuration
                  <Badge variant={emailSettings.email_enabled ? "default" : "secondary"}>
                    {emailSettings.email_enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status Overview */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {emailSettings.email_enabled ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                      )}
                      <span className="font-medium">Email Status</span>
                    </div>
                    <p className="text-sm text-slate-400">
                      {emailSettings.email_enabled ? "Email sending is enabled" : "Console logging only"}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {emailSettings.smtp_password_configured ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                      <span className="font-medium">SMTP Credentials</span>
                    </div>
                    <p className="text-sm text-slate-400">
                      {emailSettings.smtp_password_configured ? "Password configured" : "Password not set"}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-5 h-5 text-blue-400" />
                      <span className="font-medium">SMTP Server</span>
                    </div>
                    <p className="text-sm text-slate-400">
                      {emailSettings.smtp_host}:{emailSettings.smtp_port}
                    </p>
                  </div>
                </div>

                {/* Current Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Current Configuration</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SMTP Host</Label>
                      <Input
                        value={emailSettings.smtp_host}
                        readOnly
                        className="input-admin bg-slate-700/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SMTP Port</Label>
                      <Input
                        value={emailSettings.smtp_port}
                        readOnly
                        className="input-admin bg-slate-700/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SMTP Username</Label>
                      <Input
                        value={emailSettings.smtp_username}
                        readOnly
                        className="input-admin bg-slate-700/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>From Name</Label>
                      <Input
                        value={emailSettings.smtp_from_name}
                        readOnly
                        className="input-admin bg-slate-700/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Test Email Functionality */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Test Email Functionality</h3>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label>Test Email Address</Label>
                      <Input
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="your-email@example.com"
                        className="input-admin"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={handleTestEmail}
                        disabled={testingEmail || !testEmail}
                        variant="outline"
                        className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                      >
                        <TestTube className="w-4 h-4 mr-2" />
                        {testingEmail ? 'Testing...' : 'Test Email'}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400">
                    This will send test OTP and temporary password emails to verify your email configuration.
                  </p>
                </div>

                {/* Configuration Instructions */}
                <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                  <h4 className="font-medium text-blue-300 mb-2">📧 Email Configuration Instructions</h4>
                  <div className="text-sm text-slate-300 space-y-2">
                    <p><strong>To enable email sending:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 ml-4">
                      <li>Update your <code className="bg-slate-800 px-1 rounded">.env</code> file in the backend directory</li>
                      <li>Set <code className="bg-slate-800 px-1 rounded">EMAIL_ENABLED=true</code></li>
                      <li>Configure your SMTP credentials (Gmail App Password recommended)</li>
                      <li>Restart the backend server</li>
                      <li>Test the email functionality using the button above</li>
                    </ol>
                    <p className="mt-3">
                      <strong>For Gmail:</strong> Enable 2-Factor Authentication and generate an App Password.
                      <br />
                      <strong>Current Status:</strong> {emailSettings.email_enabled ? 
                        "✅ Emails will be sent via SMTP" : 
                        "⚠️ Emails are logged to server console only"
                      }
                    </p>
                  </div>
                </div>

                {/* Email Types */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Email Types Sent by System</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <h4 className="font-medium mb-2">🔐 OTP Verification</h4>
                      <p className="text-sm text-slate-400">
                        Sent when users request OTP for phone verification during registration or login.
                      </p>
                    </div>
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <h4 className="font-medium mb-2">🔑 Temporary Password</h4>
                      <p className="text-sm text-slate-400">
                        Sent during registration and password reset requests with a temporary login password.
                      </p>
                    </div>
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <h4 className="font-medium mb-2">📦 Order Notifications</h4>
                      <p className="text-sm text-slate-400">
                        Order confirmations and status updates (when implemented).
                      </p>
                    </div>
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <h4 className="font-medium mb-2">🔔 System Notifications</h4>
                      <p className="text-sm text-slate-400">
                        Important system updates and admin notifications.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Social Links Tab */}
        <TabsContent value="social">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Social Media Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Facebook URL</Label>
                  <Input
                    value={settings.facebook_url}
                    onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })}
                    placeholder="https://facebook.com/yourpage"
                    className="input-admin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instagram URL</Label>
                  <Input
                    value={settings.instagram_url}
                    onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
                    placeholder="https://instagram.com/yourhandle"
                    className="input-admin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Twitter URL</Label>
                  <Input
                    value={settings.twitter_url}
                    onChange={(e) => setSettings({ ...settings, twitter_url: e.target.value })}
                    placeholder="https://twitter.com/yourhandle"
                    className="input-admin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>YouTube URL</Label>
                  <Input
                    value={settings.youtube_url}
                    onChange={(e) => setSettings({ ...settings, youtube_url: e.target.value })}
                    placeholder="https://youtube.com/yourchannel"
                    className="input-admin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp Number</Label>
                  <Input
                    value={settings.whatsapp_number}
                    onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                    placeholder="+919876543210"
                    className="input-admin"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                UPI Payment Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>UPI ID for QR Payments</Label>
                <Input
                  value={settings.upi_id}
                  onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })}
                  placeholder="yourname@upi"
                  className="input-admin"
                />
                <p className="text-xs text-slate-400">This UPI ID will be used to generate QR codes for POS payments</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
