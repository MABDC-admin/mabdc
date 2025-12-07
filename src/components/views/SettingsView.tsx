import { useState, useEffect } from 'react';
import { useCompanySettings, useUpdateCompanySettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Clock, Globe, Save, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SettingsView() {
  const { data: settings, isLoading, refetch } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();

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
      });
    }
  }, [settings]);

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

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="bg-secondary/50 border border-border">
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
