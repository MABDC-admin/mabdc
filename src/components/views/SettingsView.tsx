import { useState, useEffect, useRef } from 'react';
import { useCompanySettings, useUpdateCompanySettings } from '@/hooks/useSettings';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Clock, Globe, Save, RefreshCw, Image, Upload, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function SettingsView() {
  const { data: settings, isLoading, refetch } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [form, setForm] = useState({
    company_name: '',
    company_name_arabic: '',
    trade_license_no: '',
    tax_registration_no: '',
    establishment_id: '',
    mol_id: '',
    address: '',
    city: '',
    emirate: '',
    country: 'UAE',
    phone: '',
    email: '',
    website: '',
    work_week_start: 'Sunday',
    work_week_end: 'Thursday',
    work_hours_per_day: '8',
    overtime_rate: '1.25',
    leave_year_start: '01-01',
    currency: 'AED',
    date_format: 'DD/MM/YYYY',
    logo_url: '',
  });

  useEffect(() => {
    if (settings) {
      setForm({
        company_name: settings.company_name || '',
        company_name_arabic: settings.company_name_arabic || '',
        trade_license_no: settings.trade_license_no || '',
        tax_registration_no: settings.tax_registration_no || '',
        establishment_id: settings.establishment_id || '',
        mol_id: settings.mol_id || '',
        address: settings.address || '',
        city: settings.city || '',
        emirate: settings.emirate || '',
        country: settings.country || 'UAE',
        phone: settings.phone || '',
        email: settings.email || '',
        website: settings.website || '',
        work_week_start: settings.work_week_start || 'Sunday',
        work_week_end: settings.work_week_end || 'Thursday',
        work_hours_per_day: settings.work_hours_per_day?.toString() || '8',
        overtime_rate: settings.overtime_rate?.toString() || '1.25',
        leave_year_start: settings.leave_year_start || '01-01',
        currency: settings.currency || 'AED',
        date_format: settings.date_format || 'DD/MM/YYYY',
        logo_url: settings.logo_url || '',
      });
    }
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be smaller than 2MB');
      return;
    }

    setIsUploadingLogo(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-documents')
        .getPublicUrl(fileName);

      setForm({ ...form, logo_url: publicUrl });
      toast.success('Logo uploaded! Click "Save Changes" to apply.');
    } catch (error: any) {
      toast.error(`Failed to upload logo: ${error.message}`);
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    setForm({ ...form, logo_url: '' });
    toast.info('Logo removed. Click "Save Changes" to apply.');
  };

  const handleSave = () => {
    updateSettings.mutate({
      company_name: form.company_name,
      company_name_arabic: form.company_name_arabic || undefined,
      trade_license_no: form.trade_license_no || undefined,
      tax_registration_no: form.tax_registration_no || undefined,
      establishment_id: form.establishment_id || undefined,
      mol_id: form.mol_id || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      emirate: form.emirate || undefined,
      country: form.country || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      website: form.website || undefined,
      work_week_start: form.work_week_start || undefined,
      work_week_end: form.work_week_end || undefined,
      work_hours_per_day: parseFloat(form.work_hours_per_day) || undefined,
      overtime_rate: parseFloat(form.overtime_rate) || undefined,
      leave_year_start: form.leave_year_start || undefined,
      currency: form.currency || undefined,
      date_format: form.date_format || undefined,
      logo_url: form.logo_url || null,
    });
  };

  const emirates = ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure company information and system preferences</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
          <Button size="sm" onClick={handleSave} disabled={updateSettings.isPending} className="bg-primary hover:bg-primary/90">
            <Save className="w-4 h-4 mr-1" /> {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="bg-secondary/50 border border-border">
          <TabsTrigger value="branding" className="data-[state=active]:bg-card">
            <Image className="w-4 h-4 mr-2" /> Branding
          </TabsTrigger>
          <TabsTrigger value="company" className="data-[state=active]:bg-card">
            <Building2 className="w-4 h-4 mr-2" /> Company
          </TabsTrigger>
          <TabsTrigger value="work" className="data-[state=active]:bg-card">
            <Clock className="w-4 h-4 mr-2" /> Work Settings
          </TabsTrigger>
          <TabsTrigger value="regional" className="data-[state=active]:bg-card">
            <Globe className="w-4 h-4 mr-2" /> Regional
          </TabsTrigger>
        </TabsList>

        {/* Branding */}
        <TabsContent value="branding" className="mt-4">
          <div className="glass-card rounded-2xl border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Company Branding</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo Upload Section */}
              <div className="space-y-4">
                <Label className="text-xs text-muted-foreground">Company Logo</Label>
                <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center bg-secondary/30 min-h-[200px]">
                  {form.logo_url ? (
                    <div className="space-y-4 text-center">
                      <img 
                        src={form.logo_url} 
                        alt="Company Logo" 
                        className="max-h-24 max-w-full object-contain mx-auto"
                      />
                      <div className="flex gap-2 justify-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingLogo}
                        >
                          <Upload className="w-4 h-4 mr-1" /> Replace
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={handleRemoveLogo}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      {isUploadingLogo ? (
                        <Loader2 className="w-10 h-10 text-muted-foreground animate-spin mx-auto" />
                      ) : (
                        <Image className="w-10 h-10 text-muted-foreground mx-auto" />
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {isUploadingLogo ? 'Uploading...' : 'No logo uploaded'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Recommended: 200x60px, PNG or SVG
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingLogo}
                      >
                        <Upload className="w-4 h-4 mr-1" /> Upload Logo
                      </Button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Maximum file size: 2MB. Supported formats: PNG, JPG, SVG, WebP
                </p>
              </div>

              {/* Preview Section */}
              <div className="space-y-4">
                <Label className="text-xs text-muted-foreground">Preview</Label>
                <div className="border border-border rounded-xl p-6 bg-card min-h-[200px]">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      {form.logo_url ? (
                        <img 
                          src={form.logo_url} 
                          alt="Logo preview" 
                          className="h-10 max-w-[160px] object-contain"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <span className="font-semibold text-foreground">
                        {form.company_name || 'Company Name'}
                      </span>
                    </div>
                    <div className="pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        This is how your branding will appear in the sidebar, kiosk, and employee portal.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Company Information */}
        <TabsContent value="company" className="mt-4">
          <div className="glass-card rounded-2xl border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Company Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Company Name (English) *</Label>
                <Input
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Company Name (Arabic)</Label>
                <Input
                  value={form.company_name_arabic}
                  onChange={(e) => setForm({ ...form, company_name_arabic: e.target.value })}
                  dir="rtl"
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Trade License No</Label>
                <Input
                  value={form.trade_license_no}
                  onChange={(e) => setForm({ ...form, trade_license_no: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tax Registration No (TRN)</Label>
                <Input
                  value={form.tax_registration_no}
                  onChange={(e) => setForm({ ...form, tax_registration_no: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Establishment ID</Label>
                <Input
                  value={form.establishment_id}
                  onChange={(e) => setForm({ ...form, establishment_id: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">MOL ID</Label>
                <Input
                  value={form.mol_id}
                  onChange={(e) => setForm({ ...form, mol_id: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
            </div>

            <h2 className="text-sm font-semibold text-foreground mb-4 mt-6 pt-4 border-t border-border">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label className="text-xs text-muted-foreground">Address</Label>
                <Textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="bg-secondary/50 border-border min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">City</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Emirate</Label>
                <Select value={form.emirate} onValueChange={(v) => setForm({ ...form, emirate: v })}>
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue placeholder="Select emirate" />
                  </SelectTrigger>
                  <SelectContent>
                    {emirates.map((emirate) => (
                      <SelectItem key={emirate} value={emirate}>{emirate}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+971 4 XXX XXXX"
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Website</Label>
                <Input
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://"
                  className="bg-secondary/50 border-border"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Work Settings */}
        <TabsContent value="work" className="mt-4">
          <div className="glass-card rounded-2xl border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Work Week Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Work Week Starts</Label>
                <Select value={form.work_week_start} onValueChange={(v) => setForm({ ...form, work_week_start: v })}>
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Work Week Ends</Label>
                <Select value={form.work_week_end} onValueChange={(v) => setForm({ ...form, work_week_end: v })}>
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Work Hours Per Day</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.work_hours_per_day}
                  onChange={(e) => setForm({ ...form, work_hours_per_day: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Overtime Rate Multiplier</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={form.overtime_rate}
                  onChange={(e) => setForm({ ...form, overtime_rate: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Leave Year Starts (MM-DD)</Label>
                <Input
                  value={form.leave_year_start}
                  onChange={(e) => setForm({ ...form, leave_year_start: e.target.value })}
                  placeholder="01-01"
                  className="bg-secondary/50 border-border"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Regional Settings */}
        <TabsContent value="regional" className="mt-4">
          <div className="glass-card rounded-2xl border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Regional Preferences</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Date Format</Label>
                <Select value={form.date_format} onValueChange={(v) => setForm({ ...form, date_format: v })}>
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Country</Label>
                <Input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
