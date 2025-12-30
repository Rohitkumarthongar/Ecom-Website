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
import { Save, Building2, Image, Share2, CreditCard, Mail, MessageSquare, TestTube, AlertCircle, CheckCircle, Info } from 'lucide-react';

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
  const [smsSettings, setSmsSettings] = useState({
    sms_enabled: false,
    sms_provider: 'console',
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_phone_number: '',
    msg91_auth_key: '',
    msg91_sender_id: '',
    msg91_template_id: '',
    twilio_configured: false,
    msg91_configured: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchEmailSettings();
    fetchSmsSettings();
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

  const fetchSmsSettings = async () => {
    try {
      const response = await settingsAPI.getSmsSettings();
      if (response.data) {
        setSmsSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch SMS settings:', error);
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

  const handleSaveEmailSettings = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateEmailSettings({
        email_enabled: emailSettings.email_enabled,
        smtp_host: emailSettings.smtp_host,
        smtp_port: emailSettings.smtp_port,
        smtp_user: emailSettings.smtp_username,
        smtp_password: emailSettings.smtp_password || undefined,
      });
      toast.success('Email settings saved successfully');
      fetchEmailSettings(); // Refresh
    } catch (error) {
      toast.error('Failed to save email settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSmsSettings = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateSmsSettings({
        sms_enabled: smsSettings.sms_enabled,
        sms_provider: smsSettings.sms_provider,
        twilio_account_sid: smsSettings.twilio_account_sid || undefined,
        twilio_auth_token: smsSettings.twilio_auth_token || undefined,
        twilio_phone_number: smsSettings.twilio_phone_number || undefined,
        msg91_auth_key: smsSettings.msg91_auth_key || undefined,
        msg91_sender_id: smsSettings.msg91_sender_id || undefined,
        msg91_template_id: smsSettings.msg91_template_id || undefined,
      });
      toast.success('SMS settings saved successfully');
      fetchSmsSettings(); // Refresh
    } catch (error) {
      toast.error('Failed to save SMS settings');
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
          <TabsTrigger value="messaging">SMS/OTP</TabsTrigger>
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

                {/* Editable Email Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Email Configuration</h3>
                    <Button
                      onClick={handleSaveEmailSettings}
                      disabled={saving}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Email Settings'}
                    </Button>
                  </div>

                  {/* Enable/Disable Email */}
                  <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                    <div>
                      <Label>Enable Email Sending</Label>
                      <p className="text-sm text-slate-400">Send emails via SMTP instead of console logs</p>
                    </div>
                    <Switch
                      checked={emailSettings.email_enabled}
                      onCheckedChange={(checked) => setEmailSettings({ ...emailSettings, email_enabled: checked })}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SMTP Host</Label>
                      <Input
                        value={emailSettings.smtp_host}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtp_host: e.target.value })}
                        placeholder="smtp.gmail.com"
                        className="input-admin"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SMTP Port</Label>
                      <Input
                        type="number"
                        value={emailSettings.smtp_port}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtp_port: parseInt(e.target.value) })}
                        placeholder="587"
                        className="input-admin"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SMTP Username/Email</Label>
                      <Input
                        value={emailSettings.smtp_username}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtp_username: e.target.value })}
                        placeholder="your-email@gmail.com"
                        className="input-admin"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>From Name</Label>
                      <Input
                        value={emailSettings.smtp_from_name}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtp_from_name: e.target.value })}
                        placeholder="BharatBazaar"
                        className="input-admin"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>SMTP Password</Label>
                      <Input
                        type="password"
                        value={emailSettings.smtp_password || ''}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtp_password: e.target.value })}
                        placeholder={emailSettings.smtp_password_configured ? "Enter new password or leave blank to keep current" : "Enter SMTP password"}
                        className="input-admin"
                      />
                      <p className="text-xs text-slate-400">
                        {emailSettings.smtp_password_configured
                          ? "✅ Password configured. Leave blank to keep existing password."
                          : "⚠️ No password configured. Enter your SMTP password."}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-400">
                    💡 Settings are saved to database and apply immediately without server restart.
                  </p>
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

        {/* SMS/Messaging Configuration Tab */}
        <TabsContent value="messaging">
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  SMS & OTP Configuration
                  <Badge variant={smsSettings.sms_enabled ? "default" : "secondary"}>
                    {smsSettings.sms_enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status Overview */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {smsSettings.sms_enabled ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                      )}
                      <span className="font-medium">SMS Status</span>
                    </div>
                    <p className="text-sm text-slate-400">
                      {smsSettings.sms_enabled ? "SMS sending enabled" : "Console logging only"}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-5 h-5 text-blue-400" />
                      <span className="font-medium">Provider</span>
                    </div>
                    <p className="text-sm text-slate-400">
                      {smsSettings.sms_provider === 'twilio' ? 'Twilio' :
                        smsSettings.sms_provider === 'msg91' ? 'MSG91' : 'Console'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {smsSettings.twilio_configured || smsSettings.msg91_configured ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                      <span className="font-medium">Credentials</span>
                    </div>
                    <p className="text-sm text-slate-400">
                      {smsSettings.twilio_configured ? "Twilio configured" :
                        smsSettings.msg91_configured ? "MSG91 configured" : "Not configured"}
                    </p>
                  </div>
                </div>

                {/* Configuration Instructions */}
                <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                  <h4 className="font-medium text-blue-300 mb-2">📱 SMS OTP Configuration</h4>
                  <div className="text-sm text-slate-300 space-y-2">
                    <p><strong>SMS OTPs are sent to users for phone verification.</strong></p>
                    <p>Choose a provider and configure credentials in your backend <code className="bg-slate-800 px-1 rounded">.env</code> file:</p>

                    <div className="mt-3 p-3 bg-slate-800/50 rounded">
                      <p className="font-medium mb-2">Option 1: Twilio (International)</p>
                      <code className="text-xs block">
                        SMS_ENABLED=true<br />
                        SMS_PROVIDER=twilio<br />
                        TWILIO_ACCOUNT_SID=your_sid<br />
                        TWILIO_AUTH_TOKEN=your_token<br />
                        TWILIO_PHONE_NUMBER=+1234567890
                      </code>
                    </div>

                    <div className="mt-3 p-3 bg-slate-800/50 rounded">
                      <p className="font-medium mb-2">Option 2: MSG91 (India)</p>
                      <code className="text-xs block">
                        SMS_ENABLED=true<br />
                        SMS_PROVIDER=msg91<br />
                        MSG91_AUTH_KEY=your_key<br />
                        MSG91_SENDER_ID=BHRZAR<br />
                        MSG91_TEMPLATE_ID=your_template_id
                      </code>
                    </div>

                    <p className="mt-3">
                      <strong>Smart Fallback:</strong> If SMS fails, the system automatically sends OTP via email if an email address is provided.
                    </p>
                  </div>
                </div>

                {/* Editable Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">SMS Configuration</h3>
                    <Button
                      onClick={handleSaveSmsSettings}
                      disabled={saving}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save SMS Settings'}
                    </Button>
                  </div>

                  {/* Enable/Disable SMS */}
                  <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                    <div>
                      <Label>Enable SMS OTP</Label>
                      <p className="text-sm text-slate-400">Send OTPs via SMS instead of console logs</p>
                    </div>
                    <Switch
                      checked={smsSettings.sms_enabled}
                      onCheckedChange={(checked) => setSmsSettings({ ...smsSettings, sms_enabled: checked })}
                    />
                  </div>

                  {/* Provider Selection */}
                  <div className="space-y-2">
                    <Label>SMS Provider</Label>
                    <select
                      value={smsSettings.sms_provider}
                      onChange={(e) => setSmsSettings({ ...smsSettings, sms_provider: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="console">Console (Development/Testing)</option>
                      <option value="twilio">Twilio (Global)</option>
                      <option value="msg91">MSG91 (India)</option>
                    </select>
                    <p className="text-xs text-slate-400">
                      {smsSettings.sms_provider === 'twilio' && '🌍 Twilio: Best for international SMS, reliable worldwide'}
                      {smsSettings.sms_provider === 'msg91' && '🇮🇳 MSG91: Optimized for India, lower costs'}
                      {smsSettings.sms_provider === 'console' && '🖥️ Console: OTPs logged to server console (no costs)'}
                    </p>
                  </div>

                  {/* Twilio Configuration */}
                  {smsSettings.sms_provider === 'twilio' && (
                    <div className="p-4 bg-slate-700/30 rounded-lg space-y-4">
                      <h4 className="font-medium">Twilio Credentials</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Account SID</Label>
                          <Input
                            value={smsSettings.twilio_account_sid}
                            onChange={(e) => setSmsSettings({ ...smsSettings, twilio_account_sid: e.target.value })}
                            placeholder="AC..."
                            className="input-admin"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone Number</Label>
                          <Input
                            value={smsSettings.twilio_phone_number}
                            onChange={(e) => setSmsSettings({ ...smsSettings, twilio_phone_number: e.target.value })}
                            placeholder="+1234567890"
                            className="input-admin"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Auth Token</Label>
                          <Input
                            type="password"
                            value={smsSettings.twilio_auth_token === '***' ? '' : smsSettings.twilio_auth_token}
                            onChange={(e) => setSmsSettings({ ...smsSettings, twilio_auth_token: e.target.value })}
                            placeholder="Enter token or leave blank to keep current"
                            className="input-admin"
                          />
                          <p className="text-xs text-slate-400">
                            Leave blank to keep existing token. Enter new token to update.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MSG91 Configuration */}
                  {smsSettings.sms_provider === 'msg91' && (
                    <div className="p-4 bg-slate-700/30 rounded-lg space-y-4">
                      <h4 className="font-medium">MSG91 Credentials</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Sender ID</Label>
                          <Input
                            value={smsSettings.msg91_sender_id}
                            onChange={(e) => setSmsSettings({ ...smsSettings, msg91_sender_id: e.target.value })}
                            placeholder="BHRZAR"
                            className="input-admin"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Template ID</Label>
                          <Input
                            value={smsSettings.msg91_template_id}
                            onChange={(e) => setSmsSettings({ ...smsSettings, msg91_template_id: e.target.value })}
                            placeholder="Template ID"
                            className="input-admin"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Auth Key</Label>
                          <Input
                            type="password"
                            value={smsSettings.msg91_auth_key === '***' ? '' : smsSettings.msg91_auth_key}
                            onChange={(e) => setSmsSettings({ ...smsSettings, msg91_auth_key: e.target.value })}
                            placeholder="Enter auth key or leave blank to keep current"
                            className="input-admin"
                          />
                          <p className="text-xs text-slate-400">
                            Leave blank to keep existing key. Enter new key to update.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Help Text */}
                  <p className="text-sm text-slate-400">
                    💡 Settings are saved to database and apply immediately without server restart.
                  </p>
                </div>

                {/* How OTP Works */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">How OTP Delivery Works</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <h4 className="font-medium mb-2">📱 Primary: SMS</h4>
                      <p className="text-sm text-slate-400">
                        System attempts to send OTP via SMS first using your configured provider (Twilio or MSG91).
                      </p>
                    </div>
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <h4 className="font-medium mb-2">📧 Fallback: Email</h4>
                      <p className="text-sm text-slate-400">
                        If SMS fails and email is provided, OTP is sent via email automatically.
                      </p>
                    </div>
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <h4 className="font-medium mb-2">🔐 Dual Channel</h4>
                      <p className="text-sm text-slate-400">
                        If SMS succeeds and email is provided, OTP is sent to both channels for better reliability.
                      </p>
                    </div>
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <h4 className="font-medium mb-2">🖥️ Console Mode</h4>
                      <p className="text-sm text-slate-400">
                        When SMS_ENABLED=false, OTPs are logged to server console for development/testing.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Setup Steps */}
                <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg">
                  <h4 className="font-medium text-green-300 mb-2">🚀 Quick Setup Steps</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-slate-300 ml-4">
                    <li>Choose a provider (Twilio for global, MSG91 for India)</li>
                    <li>Sign up and get your API credentials</li>
                    <li>Add credentials to <code className="bg-slate-800 px-1 rounded">backend/.env</code></li>
                    <li>Set <code className="bg-slate-800 px-1 rounded">SMS_ENABLED=true</code></li>
                    <li>Restart the backend server</li>
                    <li>Test by requesting OTP during registration</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-300">
                    <strong>📚 Documentation:</strong> See <code className="bg-slate-800 px-1 rounded">backend/OTP_CONFIGURATION_GUIDE.md</code> for detailed setup instructions.
                  </p>
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
