import { useState, useRef } from 'react';
import { useHRStore } from '@/store/hrStore';
import { useDeleteEmployee, useEmployees, useUpdateEmployee } from '@/hooks/useEmployees';
import { useEmployeeDocuments, useUploadDocument, useDeleteDocument, useUploadEmployeePhoto } from '@/hooks/useDocuments';
import { useLeave, useDeleteLeave } from '@/hooks/useLeave';
import { useContracts } from '@/hooks/useContracts';
import { useEmployeeEducation, useAddEducation, useDeleteEducation } from '@/hooks/useEducation';
import { EditEmployeeModal } from './EditEmployeeModal';
import { LeaveRequestModal } from './LeaveRequestModal';
import { ImagePreviewModal } from './ImagePreviewModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import emiratesIdCard from '@/assets/emirates-id-card.png';
import uaeVisa from '@/assets/uae-visa.png';
import passportIcon from '@/assets/passport-icon.png';
import contractIcon from '@/assets/contract-icon.png';
import photoPlaceholder from '@/assets/photo-placeholder.png';
import { Pencil, Trash2, FileText, Upload, Download, X, Camera, AlertTriangle, Plus, Eye, GraduationCap, User, Briefcase } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { toast } from 'sonner';

interface EmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'summary' | 'private' | 'education' | 'contract' | 'visa' | 'leave' | 'documents' | 'eos';

export function EmployeeProfileModal({ isOpen, onClose }: EmployeeProfileModalProps) {
  const { currentEmployee, setCurrentEmployee } = useHRStore();
  const { refetch: refetchEmployees } = useEmployees();
  const deleteEmployee = useDeleteEmployee();
  const updateEmployee = useUpdateEmployee();
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  // Image preview state
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Private info edit state
  const [isEditingPrivate, setIsEditingPrivate] = useState(false);
  const [privateInfo, setPrivateInfo] = useState({
    gender: '',
    birthday: '',
    personal_email: '',
    personal_phone: '',
    home_address: '',
    place_of_birth: '',
    country_of_birth: '',
    family_status: '',
    number_of_children: 0,
  });

  // Education state
  const [newEducation, setNewEducation] = useState({ certificate_level: '', field_of_study: '', school: '', graduation_year: '' });

  // Hooks for documents
  const { data: documents = [], refetch: refetchDocs } = useEmployeeDocuments(currentEmployee?.id || '');
  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();
  const uploadPhoto = useUploadEmployeePhoto();

  // Hooks for leave records
  const { data: leaveRecords = [] } = useLeave();
  const deleteLeave = useDeleteLeave();
  const employeeLeaveRecords = leaveRecords.filter(r => r.employee_id === currentEmployee?.id);

  // Hooks for contracts
  const { data: contracts = [] } = useContracts();
  const employeeContract = contracts.find(c => c.employee_id === currentEmployee?.id && c.status === 'Active');

  // Hooks for education
  const { data: education = [], refetch: refetchEducation } = useEmployeeEducation(currentEmployee?.id || '');
  const addEducation = useAddEducation();
  const deleteEducation = useDeleteEducation();

  if (!currentEmployee) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${currentEmployee.full_name}? This action cannot be undone.`)) {
      deleteEmployee.mutate(currentEmployee.id);
      setCurrentEmployee(null);
      onClose();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, category?: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (max 10MB)`);
        continue;
      }
      await uploadDocument.mutateAsync({
        file,
        employeeId: currentEmployee.id,
        category: category || 'Other',
      });
    }
    refetchDocs();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    await uploadPhoto.mutateAsync({ file, employeeId: currentEmployee.id });
    refetchEmployees();
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleDeleteDocument = async (docId: string, fileUrl: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      await deleteDocument.mutateAsync({ id: docId, employeeId: currentEmployee.id, fileUrl });
    }
  };

  const handleAddEducation = async () => {
    if (!newEducation.certificate_level) {
      toast.error('Certificate level is required');
      return;
    }
    await addEducation.mutateAsync({
      employee_id: currentEmployee.id,
      certificate_level: newEducation.certificate_level,
      field_of_study: newEducation.field_of_study || undefined,
      school: newEducation.school || undefined,
      graduation_year: newEducation.graduation_year ? parseInt(newEducation.graduation_year) : undefined,
    });
    setNewEducation({ certificate_level: '', field_of_study: '', school: '', graduation_year: '' });
    refetchEducation();
  };

  const handleEditPrivateInfo = () => {
    setPrivateInfo({
      gender: emp.gender || '',
      birthday: emp.birthday || '',
      personal_email: emp.personal_email || '',
      personal_phone: emp.personal_phone || '',
      home_address: emp.home_address || '',
      place_of_birth: emp.place_of_birth || '',
      country_of_birth: emp.country_of_birth || '',
      family_status: emp.family_status || '',
      number_of_children: emp.number_of_children || 0,
    });
    setIsEditingPrivate(true);
  };

  const handleSavePrivateInfo = async () => {
    try {
      await updateEmployee.mutateAsync({
        id: currentEmployee.id,
        ...privateInfo,
      });
      setIsEditingPrivate(false);
      toast.success('Private information updated');
      refetchEmployees();
    } catch (error) {
      toast.error('Failed to update private information');
    }
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'private', label: '👤 Private' },
    { id: 'education', label: '🎓 Education' },
    { id: 'contract', label: 'Contract' },
    { id: 'visa', label: 'Visa & ID' },
    { id: 'leave', label: 'Leave' },
    { id: 'documents', label: '📁 Documents' },
    { id: 'eos', label: 'EOS' },
  ];

  const calculateServiceLength = () => {
    const start = new Date(currentEmployee.joining_date);
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear();
    const months = now.getMonth() - start.getMonth();
    return `${years} years ${months >= 0 ? months : 12 + months} months`;
  };

  const estimateGratuity = () => {
    const start = new Date(currentEmployee.joining_date);
    const now = new Date();
    const years = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const basicSalary = currentEmployee.basic_salary || 0;
    
    if (years < 1) return 0;
    if (years <= 5) {
      return Math.round((21 / 30) * basicSalary * years);
    }
    const first5 = (21 / 30) * basicSalary * 5;
    const remaining = (30 / 30) * basicSalary * (years - 5);
    return Math.round(first5 + remaining);
  };

  const getExpiryWarning = (date: string | undefined) => {
    if (!date) return null;
    const daysUntil = differenceInDays(parseISO(date), new Date());
    if (daysUntil < 0) return { type: 'expired', text: 'Expired' };
    if (daysUntil <= 30) return { type: 'urgent', text: `Expires in ${daysUntil} days` };
    if (daysUntil <= 60) return { type: 'warning', text: `Expires in ${daysUntil} days` };
    return null;
  };

  const handleDocumentClick = (doc: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (doc?.file_url && doc.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      setPreviewImage({ url: doc.file_url, title: doc.category || 'Document' });
    } else if (doc?.file_url) {
      window.open(doc.file_url, '_blank');
    }
  };

  // Get employee with extended fields
  const emp = currentEmployee as any;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto glass-card border-border soft-scroll p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative group">
                  {currentEmployee.photo_url ? (
                    <img 
                      src={currentEmployee.photo_url} 
                      alt={currentEmployee.full_name}
                      className="w-16 h-16 rounded-2xl object-cover"
                    />
                  ) : (
                    <span className="w-16 h-16 rounded-2xl avatar-gradient flex items-center justify-center text-xl font-bold text-primary-foreground">
                      {getInitials(currentEmployee.full_name)}
                    </span>
                  )}
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-foreground">
                    {currentEmployee.full_name}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    {currentEmployee.job_position} • {currentEmployee.department}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  onClick={() => setIsEditOpen(true)}
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Tabs Navigation */}
          <div className="flex border-b border-border mt-6 overflow-x-auto px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "profile-tab px-4 py-3 text-sm font-medium text-muted-foreground whitespace-nowrap",
                  activeTab === tab.id && "active text-primary"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6 space-y-6">
            {/* Summary Tab */}
            {activeTab === 'summary' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass-card rounded-2xl border border-border p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">CONTRACT</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-semibold text-foreground">
                          {currentEmployee.contract_type || 'Unlimited'} contract
                        </p>
                        <span className={cn(
                          "inline-block px-3 py-1 rounded-full text-xs font-medium mt-1",
                          currentEmployee.status === 'Active'
                            ? "bg-primary/20 text-primary border border-primary/40"
                            : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                        )}>
                          {currentEmployee.status || 'Active'}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">{currentEmployee.hrms_no}</span>
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl border border-border p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">REMINDERS</p>
                    <div className="space-y-2">
                      {getExpiryWarning(currentEmployee.visa_expiration) && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={cn("w-4 h-4", 
                            getExpiryWarning(currentEmployee.visa_expiration)?.type === 'expired' ? 'text-destructive' :
                            getExpiryWarning(currentEmployee.visa_expiration)?.type === 'urgent' ? 'text-amber-400' : 'text-yellow-400'
                          )} />
                          <span className="text-sm text-foreground">Visa: {getExpiryWarning(currentEmployee.visa_expiration)?.text}</span>
                        </div>
                      )}
                      {!getExpiryWarning(currentEmployee.visa_expiration) && 
                       !getExpiryWarning(currentEmployee.emirates_id_expiry) && 
                       !getExpiryWarning(currentEmployee.passport_expiry) && (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary" />
                          <span className="text-sm text-foreground">All documents up to date</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-2xl border border-border p-5">
                  <h3 className="text-lg font-semibold text-foreground mb-4">SUMMARY</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Joined</p>
                        <p className="text-lg font-semibold text-foreground">
                          {new Date(currentEmployee.joining_date).toLocaleDateString('en-GB', { 
                            day: '2-digit', month: 'short', year: 'numeric' 
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Service Length</p>
                        <p className="text-lg font-semibold text-primary">{calculateServiceLength()}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Nationality</p>
                        <p className="text-lg font-semibold text-foreground">{currentEmployee.nationality || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Basic Salary</p>
                        <p className="text-xl font-bold text-primary">
                          AED {(currentEmployee.basic_salary || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total Salary</p>
                        <p className="text-xl font-bold text-accent">
                          AED {(employeeContract?.total_salary || (currentEmployee.basic_salary || 0) + (currentEmployee.allowance || 0)).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Leave Balance</p>
                        <p className="text-lg font-semibold text-foreground">{currentEmployee.leave_balance || 0} days</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Est. Gratuity</p>
                        <p className="text-lg font-semibold text-primary">AED {estimateGratuity().toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Private Information Tab */}
            {activeTab === 'private' && (
              <div className="space-y-6 animate-fade-in">
                <div className="glass-card rounded-2xl border border-border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      PRIVATE INFORMATION
                    </h3>
                    {!isEditingPrivate ? (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleEditPrivateInfo}
                        className="gap-2"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setIsEditingPrivate(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={handleSavePrivateInfo}
                          className="bg-primary hover:bg-primary/90"
                        >
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </div>

                  {!isEditingPrivate ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Gender</p>
                          <p className="text-lg font-semibold text-foreground">{emp.gender || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Birthday</p>
                          <p className="text-lg font-semibold text-foreground">
                            {emp.birthday ? format(parseISO(emp.birthday), 'dd MMM yyyy') : 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Family Status</p>
                          <p className="text-lg font-semibold text-foreground">{emp.family_status || 'Not specified'}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Personal Email</p>
                          <p className="text-lg font-semibold text-foreground">{emp.personal_email || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Personal Phone</p>
                          <p className="text-lg font-semibold text-foreground">{emp.personal_phone || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dependent Children</p>
                          <p className="text-lg font-semibold text-foreground">{emp.number_of_children ?? 0}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Place of Birth</p>
                          <p className="text-lg font-semibold text-foreground">{emp.place_of_birth || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Country of Birth</p>
                          <p className="text-lg font-semibold text-foreground">{emp.country_of_birth || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Home Address</p>
                          <p className="text-sm font-semibold text-foreground">{emp.home_address || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Gender</Label>
                          <select
                            value={privateInfo.gender}
                            onChange={(e) => setPrivateInfo({ ...privateInfo, gender: e.target.value })}
                            className="w-full p-2 rounded-lg bg-secondary/50 border border-border text-foreground"
                          >
                            <option value="">Select...</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Birthday</Label>
                          <Input
                            type="date"
                            value={privateInfo.birthday}
                            onChange={(e) => setPrivateInfo({ ...privateInfo, birthday: e.target.value })}
                            className="bg-secondary/50 border-border"
                          />
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Family Status</Label>
                          <select
                            value={privateInfo.family_status}
                            onChange={(e) => setPrivateInfo({ ...privateInfo, family_status: e.target.value })}
                            className="w-full p-2 rounded-lg bg-secondary/50 border border-border text-foreground"
                          >
                            <option value="">Select...</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Widowed">Widowed</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Personal Email</Label>
                          <Input
                            type="email"
                            value={privateInfo.personal_email}
                            onChange={(e) => setPrivateInfo({ ...privateInfo, personal_email: e.target.value })}
                            placeholder="personal@email.com"
                            className="bg-secondary/50 border-border"
                          />
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Personal Phone</Label>
                          <Input
                            type="tel"
                            value={privateInfo.personal_phone}
                            onChange={(e) => setPrivateInfo({ ...privateInfo, personal_phone: e.target.value })}
                            placeholder="+971 50 XXX XXXX"
                            className="bg-secondary/50 border-border"
                          />
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dependent Children</Label>
                          <Input
                            type="number"
                            min="0"
                            value={privateInfo.number_of_children}
                            onChange={(e) => setPrivateInfo({ ...privateInfo, number_of_children: parseInt(e.target.value) || 0 })}
                            className="bg-secondary/50 border-border"
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Place of Birth</Label>
                          <Input
                            value={privateInfo.place_of_birth}
                            onChange={(e) => setPrivateInfo({ ...privateInfo, place_of_birth: e.target.value })}
                            placeholder="City"
                            className="bg-secondary/50 border-border"
                          />
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Country of Birth</Label>
                          <Input
                            value={privateInfo.country_of_birth}
                            onChange={(e) => setPrivateInfo({ ...privateInfo, country_of_birth: e.target.value })}
                            placeholder="Country"
                            className="bg-secondary/50 border-border"
                          />
                        </div>
                        <div>
                          <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Home Address</Label>
                          <Input
                            value={privateInfo.home_address}
                            onChange={(e) => setPrivateInfo({ ...privateInfo, home_address: e.target.value })}
                            placeholder="Full address"
                            className="bg-secondary/50 border-border"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Education Tab */}
            {activeTab === 'education' && (
              <div className="space-y-6 animate-fade-in">
                <div className="glass-card rounded-2xl border border-border p-5">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    EDUCATION HISTORY
                  </h3>
                  
                  {/* Add Education Form */}
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border mb-6">
                    <p className="text-sm font-medium text-foreground mb-3">Add Education Record</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Certificate Level *</Label>
                        <select
                          value={newEducation.certificate_level}
                          onChange={(e) => setNewEducation({ ...newEducation, certificate_level: e.target.value })}
                          className="w-full p-2 rounded-lg bg-secondary/50 border border-border text-foreground text-sm"
                        >
                          <option value="">Select...</option>
                          <option value="High School">High School</option>
                          <option value="Diploma">Diploma</option>
                          <option value="Bachelor's Degree">Bachelor's Degree</option>
                          <option value="Master's Degree">Master's Degree</option>
                          <option value="PhD">PhD</option>
                          <option value="Professional Certificate">Professional Certificate</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Field of Study</Label>
                        <Input
                          value={newEducation.field_of_study}
                          onChange={(e) => setNewEducation({ ...newEducation, field_of_study: e.target.value })}
                          placeholder="e.g., Computer Science"
                          className="bg-secondary/50 border-border"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">School/University</Label>
                        <Input
                          value={newEducation.school}
                          onChange={(e) => setNewEducation({ ...newEducation, school: e.target.value })}
                          placeholder="e.g., University of..."
                          className="bg-secondary/50 border-border"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">Year</Label>
                          <Input
                            type="number"
                            value={newEducation.graduation_year}
                            onChange={(e) => setNewEducation({ ...newEducation, graduation_year: e.target.value })}
                            placeholder="2020"
                            className="bg-secondary/50 border-border"
                          />
                        </div>
                        <Button onClick={handleAddEducation} size="icon" className="bg-primary hover:bg-primary/90">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Education List */}
                  {education.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No education records found</p>
                  ) : (
                    <div className="space-y-3">
                      {education.map((edu) => (
                        <div key={edu.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <GraduationCap className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{edu.certificate_level}</p>
                              <p className="text-sm text-muted-foreground">
                                {edu.field_of_study && `${edu.field_of_study} • `}
                                {edu.school}
                                {edu.graduation_year && ` (${edu.graduation_year})`}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteEducation.mutate({ id: edu.id, employeeId: currentEmployee.id })}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contract Tab */}
            {activeTab === 'contract' && (
              <div className="space-y-6 animate-fade-in">
                <div className="glass-card rounded-2xl border border-border p-5">
                  <h3 className="text-lg font-semibold text-foreground mb-4">CONTRACT DETAILS</h3>
                  {employeeContract ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">MOHRE Contract No</p>
                          <p className="text-lg font-semibold text-foreground">{employeeContract.mohre_contract_no}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Contract Type</p>
                          <p className="text-lg font-semibold text-foreground">{employeeContract.contract_type}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Start Date</p>
                          <p className="text-lg font-semibold text-foreground">{format(parseISO(employeeContract.start_date), 'dd MMM yyyy')}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Basic Salary</p>
                          <p className="text-lg font-semibold text-primary">AED {employeeContract.basic_salary.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total Salary</p>
                          <p className="text-lg font-semibold text-accent">AED {(employeeContract.total_salary || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Work Location</p>
                          <p className="text-lg font-semibold text-foreground">{employeeContract.work_location || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No active contract found</p>
                  )}
                </div>
              </div>
            )}

            {/* Visa & ID Tab */}
            {activeTab === 'visa' && (
              <div className="space-y-6 animate-fade-in">
                <div className="glass-card rounded-2xl border border-border p-5">
                  <h3 className="text-lg font-semibold text-foreground mb-4">VISA & IDENTIFICATION</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Emirates ID</p>
                        <p className="text-lg font-semibold text-foreground">{currentEmployee.emirates_id || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Expiry</p>
                        <p className="text-lg font-semibold text-foreground">
                          {currentEmployee.emirates_id_expiry ? format(parseISO(currentEmployee.emirates_id_expiry), 'dd MMM yyyy') : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Passport No</p>
                        <p className="text-lg font-semibold text-foreground">{currentEmployee.passport_no || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Expiry</p>
                        <p className="text-lg font-semibold text-foreground">
                          {currentEmployee.passport_expiry ? format(parseISO(currentEmployee.passport_expiry), 'dd MMM yyyy') : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Visa No</p>
                        <p className="text-lg font-semibold text-foreground">{currentEmployee.visa_no || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Expiry</p>
                        <p className="text-lg font-semibold text-foreground">
                          {currentEmployee.visa_expiration ? format(parseISO(currentEmployee.visa_expiration), 'dd MMM yyyy') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Leave Tab */}
            {activeTab === 'leave' && (
              <div className="space-y-6 animate-fade-in">
                <div className="glass-card rounded-2xl border border-border p-5">
                  <h3 className="text-lg font-semibold text-foreground mb-4">LEAVE HISTORY</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Annual entitlement</p>
                      <p className="text-lg font-semibold text-foreground">30 days / year</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current balance</p>
                      <p className="text-lg font-semibold text-foreground">{currentEmployee.leave_balance || 0} days</p>
                    </div>
                  </div>
                  
                  {employeeLeaveRecords.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No leave records found</p>
                  ) : (
                    <div className="space-y-2">
                      {employeeLeaveRecords.slice(0, 5).map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 group">
                          <span className="text-sm text-foreground">
                            {record.leave_type} – {record.days_count} day(s)
                            <span className="text-xs text-muted-foreground ml-2">
                              ({format(parseISO(record.start_date), 'dd MMM')} - {format(parseISO(record.end_date), 'dd MMM yyyy')})
                            </span>
                          </span>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            record.status === 'Approved' && "bg-primary/20 text-primary",
                            record.status === 'Pending' && "bg-amber-500/20 text-amber-400",
                            record.status === 'Rejected' && "bg-destructive/20 text-destructive"
                          )}>
                            {record.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Button 
                    className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
                    onClick={() => setIsLeaveOpen(true)}
                  >
                    Create new leave request
                  </Button>
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-6 animate-fade-in">
                <div className="glass-card rounded-2xl border border-border p-5">
                  <h3 className="text-lg font-semibold text-foreground mb-6 text-center">EMPLOYEE DOCUMENTS</h3>
                  
                  {/* Document Cards Grid - with Work Permit */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    {/* Photo Card */}
                    <div className="relative group">
                      <input type="file" id="photo-upload-doc" accept="image/*" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          await uploadPhoto.mutateAsync({ file, employeeId: currentEmployee.id });
                          refetchEmployees();
                        }
                      }} className="hidden" />
                      <label htmlFor="photo-upload-doc" className="block cursor-pointer">
                        <div className="relative p-4 rounded-2xl border-2 border-dashed border-border bg-gradient-to-br from-pink-500/5 to-purple-500/5 hover:border-pink-500/50 transition-all duration-300">
                          <div className="flex flex-col items-center">
                            {currentEmployee.photo_url ? (
                              <>
                                <img src={currentEmployee.photo_url} alt="Photo" className="w-16 h-16 rounded-full object-cover mb-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewImage({ url: currentEmployee.photo_url!, title: 'Employee Photo' }); }} />
                                <p className="text-xs font-medium text-foreground">Photo</p>
                                <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 mt-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); document.getElementById('photo-upload-doc')?.click(); }}>Change</Button>
                              </>
                            ) : (
                              <>
                                <img src={photoPlaceholder} alt="Photo" className="w-16 h-auto mb-2 opacity-60" />
                                <p className="text-xs font-medium text-foreground">Photo</p>
                                <p className="text-[10px] text-muted-foreground">Upload</p>
                              </>
                            )}
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* Emirates ID */}
                    <div className="relative group">
                      <input type="file" id="eid-upload" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'Emirates ID')} className="hidden" />
                      <label htmlFor="eid-upload" className="block cursor-pointer">
                        <div className="relative p-4 rounded-2xl border-2 border-dashed border-border bg-gradient-to-br from-primary/5 to-accent/5 hover:border-primary/50 transition-all">
                          <div className="flex flex-col items-center">
                            {documents.find(d => d.category === 'Emirates ID') ? (
                              <>
                                <img src={documents.find(d => d.category === 'Emirates ID')?.file_url || emiratesIdCard} alt="EID" className="w-16 h-auto rounded-lg mb-2" onClick={(e) => handleDocumentClick(documents.find(d => d.category === 'Emirates ID'), e)} />
                                <p className="text-xs font-medium text-foreground">Emirates ID</p>
                                <div className="flex gap-1 mt-1">
                                  <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={(e) => handleDocumentClick(documents.find(d => d.category === 'Emirates ID'), e)}><Eye className="w-3 h-3" /></Button>
                                  <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); document.getElementById('eid-upload')?.click(); }}><Pencil className="w-3 h-3" /></Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <img src={emiratesIdCard} alt="EID" className="w-16 h-auto mb-2 opacity-60" />
                                <p className="text-xs font-medium text-foreground">Emirates ID</p>
                                <p className="text-[10px] text-muted-foreground">Upload</p>
                              </>
                            )}
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* Visa */}
                    <div className="relative group">
                      <input type="file" id="visa-upload" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'Visa')} className="hidden" />
                      <label htmlFor="visa-upload" className="block cursor-pointer">
                        <div className="relative p-4 rounded-2xl border-2 border-dashed border-border bg-gradient-to-br from-accent/5 to-primary/5 hover:border-accent/50 transition-all">
                          <div className="flex flex-col items-center">
                            {documents.find(d => d.category === 'Visa') ? (
                              <>
                                <img src={documents.find(d => d.category === 'Visa')?.file_url || uaeVisa} alt="Visa" className="w-16 h-auto rounded-lg mb-2" onClick={(e) => handleDocumentClick(documents.find(d => d.category === 'Visa'), e)} />
                                <p className="text-xs font-medium text-foreground">Visa</p>
                                <div className="flex gap-1 mt-1">
                                  <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={(e) => handleDocumentClick(documents.find(d => d.category === 'Visa'), e)}><Eye className="w-3 h-3" /></Button>
                                  <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); document.getElementById('visa-upload')?.click(); }}><Pencil className="w-3 h-3" /></Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <img src={uaeVisa} alt="Visa" className="w-16 h-auto mb-2 opacity-60" />
                                <p className="text-xs font-medium text-foreground">Visa</p>
                                <p className="text-[10px] text-muted-foreground">Upload</p>
                              </>
                            )}
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* Passport */}
                    <div className="relative group">
                      <input type="file" id="passport-upload" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'Passport')} className="hidden" />
                      <label htmlFor="passport-upload" className="block cursor-pointer">
                        <div className="relative p-4 rounded-2xl border-2 border-dashed border-border bg-gradient-to-br from-blue-500/5 to-indigo-500/5 hover:border-blue-500/50 transition-all">
                          <div className="flex flex-col items-center">
                            {documents.find(d => d.category === 'Passport') ? (
                              <>
                                <img src={documents.find(d => d.category === 'Passport')?.file_url || passportIcon} alt="Passport" className="w-16 h-auto rounded-lg mb-2" onClick={(e) => handleDocumentClick(documents.find(d => d.category === 'Passport'), e)} />
                                <p className="text-xs font-medium text-foreground">Passport</p>
                                <div className="flex gap-1 mt-1">
                                  <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={(e) => handleDocumentClick(documents.find(d => d.category === 'Passport'), e)}><Eye className="w-3 h-3" /></Button>
                                  <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); document.getElementById('passport-upload')?.click(); }}><Pencil className="w-3 h-3" /></Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <img src={passportIcon} alt="Passport" className="w-16 h-auto mb-2 opacity-60" />
                                <p className="text-xs font-medium text-foreground">Passport</p>
                                <p className="text-[10px] text-muted-foreground">Upload</p>
                              </>
                            )}
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* Contract */}
                    <div className="relative group">
                      <input type="file" id="contract-upload" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'Contract')} className="hidden" />
                      <label htmlFor="contract-upload" className="block cursor-pointer">
                        <div className="relative p-4 rounded-2xl border-2 border-dashed border-border bg-gradient-to-br from-green-500/5 to-emerald-500/5 hover:border-green-500/50 transition-all">
                          <div className="flex flex-col items-center">
                            {documents.find(d => d.category === 'Contract') ? (
                              <>
                                <img src={documents.find(d => d.category === 'Contract')?.file_url || contractIcon} alt="Contract" className="w-16 h-auto rounded-lg mb-2" onClick={(e) => handleDocumentClick(documents.find(d => d.category === 'Contract'), e)} />
                                <p className="text-xs font-medium text-foreground">Contract</p>
                                <div className="flex gap-1 mt-1">
                                  <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={(e) => handleDocumentClick(documents.find(d => d.category === 'Contract'), e)}><Eye className="w-3 h-3" /></Button>
                                  <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); document.getElementById('contract-upload')?.click(); }}><Pencil className="w-3 h-3" /></Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <img src={contractIcon} alt="Contract" className="w-16 h-auto mb-2 opacity-60" />
                                <p className="text-xs font-medium text-foreground">Contract</p>
                                <p className="text-[10px] text-muted-foreground">Upload</p>
                              </>
                            )}
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* Work Permit */}
                    <div className="relative group">
                      <input type="file" id="workpermit-upload" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'Work Permit')} className="hidden" />
                      <label htmlFor="workpermit-upload" className="block cursor-pointer">
                        <div className="relative p-4 rounded-2xl border-2 border-dashed border-border bg-gradient-to-br from-orange-500/5 to-amber-500/5 hover:border-orange-500/50 transition-all">
                          <div className="flex flex-col items-center">
                            {documents.find(d => d.category === 'Work Permit') ? (
                              <>
                                <div className="w-16 h-16 rounded-lg bg-orange-500/20 flex items-center justify-center mb-2" onClick={(e) => handleDocumentClick(documents.find(d => d.category === 'Work Permit'), e)}>
                                  <Briefcase className="w-8 h-8 text-orange-500" />
                                </div>
                                <p className="text-xs font-medium text-foreground">Work Permit</p>
                                <div className="flex gap-1 mt-1">
                                  <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={(e) => handleDocumentClick(documents.find(d => d.category === 'Work Permit'), e)}><Eye className="w-3 h-3" /></Button>
                                  <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); document.getElementById('workpermit-upload')?.click(); }}><Pencil className="w-3 h-3" /></Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="w-16 h-16 rounded-lg bg-orange-500/10 flex items-center justify-center mb-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                  <Briefcase className="w-8 h-8 text-orange-400" />
                                </div>
                                <p className="text-xs font-medium text-foreground">Work Permit</p>
                                <p className="text-[10px] text-muted-foreground">Upload</p>
                              </>
                            )}
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  {/* Other Documents Upload */}
                  <div 
                    className="file-drop-area p-6 text-center mb-6 border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-base font-semibold text-foreground mb-1">Other Documents</p>
                    <p className="text-sm text-muted-foreground">Drag & drop or click to browse</p>
                    <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.xlsx,.xls,.doc,.docx" onChange={(e) => handleFileUpload(e)} className="hidden" />
                  </div>

                  {/* Uploaded Documents List */}
                  {documents.filter(d => !['Photo', 'Emirates ID', 'Visa', 'Passport', 'Contract', 'Work Permit'].includes(d.category || '')).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground mb-2">Other Uploaded Documents</p>
                      {documents.filter(d => !['Photo', 'Emirates ID', 'Visa', 'Passport', 'Contract', 'Work Permit'].includes(d.category || '')).map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border group">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-primary" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">{doc.file_size}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(doc.file_url, '_blank')}>
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteDocument(doc.id, doc.file_url)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* EOS Tab */}
            {activeTab === 'eos' && (
              <div className="space-y-6 animate-fade-in">
                <div className="glass-card rounded-2xl border border-border p-5">
                  <h3 className="text-lg font-semibold text-foreground mb-4">END OF SERVICE GRATUITY</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Service Length</p>
                      <p className="text-lg font-semibold text-foreground">{calculateServiceLength()}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Estimated Gratuity</p>
                      <p className="text-2xl font-bold text-primary">AED {estimateGratuity().toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    * Calculated based on UAE Labor Law: 21 days salary per year for first 5 years, 30 days per year thereafter.
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <EditEmployeeModal 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)} 
        employee={currentEmployee} 
      />

      <LeaveRequestModal
        isOpen={isLeaveOpen}
        onClose={() => setIsLeaveOpen(false)}
        employeeId={currentEmployee.id}
        employeeName={currentEmployee.full_name}
      />

      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || ''}
        title={previewImage?.title}
      />
    </>
  );
}
