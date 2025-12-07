import { useState, useRef } from 'react';
import { useHRStore } from '@/store/hrStore';
import { useDeleteEmployee, useEmployees } from '@/hooks/useEmployees';
import { useEmployeeDocuments, useUploadDocument, useDeleteDocument, useUploadEmployeePhoto } from '@/hooks/useDocuments';
import { useLeave } from '@/hooks/useLeave';
import { useContracts } from '@/hooks/useContracts';
import { EditEmployeeModal } from './EditEmployeeModal';
import { LeaveRequestModal } from './LeaveRequestModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import emiratesIdCard from '@/assets/emirates-id-card.png';
import { Pencil, Trash2, FileText, Upload, Download, X, Camera, Calendar, Bell, AlertTriangle } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { toast } from 'sonner';

interface EmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'summary' | 'contract' | 'visa' | 'leave' | 'documents' | 'eos';

export function EmployeeProfileModal({ isOpen, onClose }: EmployeeProfileModalProps) {
  const { currentEmployee, setCurrentEmployee } = useHRStore();
  const { refetch: refetchEmployees } = useEmployees();
  const deleteEmployee = useDeleteEmployee();
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Hooks for documents
  const { data: documents = [], refetch: refetchDocs } = useEmployeeDocuments(currentEmployee?.id || '');
  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();
  const uploadPhoto = useUploadEmployeePhoto();

  // Hooks for leave records
  const { data: leaveRecords = [] } = useLeave();
  const employeeLeaveRecords = leaveRecords.filter(r => r.employee_id === currentEmployee?.id);

  // Hooks for contracts
  const { data: contracts = [] } = useContracts();
  const employeeContract = contracts.find(c => c.employee_id === currentEmployee?.id && c.status === 'Active');

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

  const tabs: { id: TabType; label: string }[] = [
    { id: 'summary', label: 'Summary' },
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

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('word') || fileType.includes('doc')) return '📝';
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
    return '📁';
  };

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
                      {getExpiryWarning(currentEmployee.emirates_id_expiry) && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={cn("w-4 h-4", 
                            getExpiryWarning(currentEmployee.emirates_id_expiry)?.type === 'expired' ? 'text-destructive' :
                            getExpiryWarning(currentEmployee.emirates_id_expiry)?.type === 'urgent' ? 'text-amber-400' : 'text-yellow-400'
                          )} />
                          <span className="text-sm text-foreground">Emirates ID: {getExpiryWarning(currentEmployee.emirates_id_expiry)?.text}</span>
                        </div>
                      )}
                      {getExpiryWarning(currentEmployee.passport_expiry) && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={cn("w-4 h-4", 
                            getExpiryWarning(currentEmployee.passport_expiry)?.type === 'expired' ? 'text-destructive' :
                            getExpiryWarning(currentEmployee.passport_expiry)?.type === 'urgent' ? 'text-amber-400' : 'text-yellow-400'
                          )} />
                          <span className="text-sm text-foreground">Passport: {getExpiryWarning(currentEmployee.passport_expiry)?.text}</span>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Basic Salary</p>
                        <p className="text-xl font-bold text-primary">
                          AED {(currentEmployee.basic_salary || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Service Length</p>
                        <p className="text-lg font-semibold text-primary">{calculateServiceLength()}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Allowance</p>
                        <p className="text-xl font-bold text-primary">
                          AED {(currentEmployee.allowance || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-2xl border border-border p-5">
                  <h3 className="text-lg font-semibold text-foreground mb-4">CURRENT LEAVE</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Annual leave balance</p>
                      <p className="text-3xl font-bold text-foreground">{currentEmployee.leave_balance || 0} days</p>
                    </div>
                    <Button 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
                      onClick={() => setIsLeaveOpen(true)}
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Book leave
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Contract Tab */}
            {activeTab === 'contract' && (
              <div className="space-y-6 animate-fade-in">
                <div className="glass-card rounded-2xl border border-border p-5">
                  <h3 className="text-lg font-semibold text-foreground mb-4">LABOUR CONTRACT DETAILS</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Contract type</p>
                        <p className="text-lg font-semibold text-foreground">{employeeContract?.contract_type || currentEmployee.contract_type || 'Unlimited'} (UAE)</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Start date</p>
                        <p className="text-lg font-semibold text-foreground">
                          {employeeContract?.start_date 
                            ? format(parseISO(employeeContract.start_date), 'dd/MM/yyyy')
                            : new Date(currentEmployee.joining_date).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">End date</p>
                        <p className="text-lg font-semibold text-foreground">
                          {employeeContract?.end_date 
                            ? format(parseISO(employeeContract.end_date), 'dd/MM/yyyy')
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Weekly hours</p>
                        <p className="text-lg font-semibold text-foreground">{employeeContract?.working_hours || 48} hours</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">MOHRE contract no.</p>
                        <p className="text-lg font-semibold text-foreground">{employeeContract?.mohre_contract_no || `CNTR-${currentEmployee.hrms_no}`}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Basic Salary</p>
                        <p className="text-lg font-semibold text-primary">AED {(employeeContract?.basic_salary || currentEmployee.basic_salary || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Notice period</p>
                        <p className="text-lg font-semibold text-foreground">{employeeContract?.notice_period || 30} days</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Annual Leave</p>
                        <p className="text-lg font-semibold text-foreground">{employeeContract?.annual_leave_days || 30} days</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Visa & ID Tab */}
            {activeTab === 'visa' && (
              <div className="space-y-6 animate-fade-in">
                <div className="glass-card rounded-2xl border border-border p-5">
                  <h3 className="text-lg font-semibold text-foreground mb-4">VISA & EMIRATES ID</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Visa number</p>
                        <p className="text-lg font-semibold text-foreground">{currentEmployee.visa_no || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Visa expiry</p>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold text-primary">
                            {currentEmployee.visa_expiration 
                              ? new Date(currentEmployee.visa_expiration).toLocaleDateString('en-GB')
                              : 'Not set'}
                          </p>
                          {getExpiryWarning(currentEmployee.visa_expiration) && (
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-xs",
                              getExpiryWarning(currentEmployee.visa_expiration)?.type === 'expired' ? 'bg-destructive/20 text-destructive' :
                              getExpiryWarning(currentEmployee.visa_expiration)?.type === 'urgent' ? 'bg-amber-500/20 text-amber-400' : 'bg-yellow-500/20 text-yellow-400'
                            )}>
                              {getExpiryWarning(currentEmployee.visa_expiration)?.text}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Emirates ID</p>
                        <p className="text-lg font-semibold text-foreground">{currentEmployee.emirates_id || 'Not set'}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">EID expiry</p>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold text-primary">
                            {currentEmployee.emirates_id_expiry 
                              ? new Date(currentEmployee.emirates_id_expiry).toLocaleDateString('en-GB')
                              : 'Not set'}
                          </p>
                          {getExpiryWarning(currentEmployee.emirates_id_expiry) && (
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-xs",
                              getExpiryWarning(currentEmployee.emirates_id_expiry)?.type === 'expired' ? 'bg-destructive/20 text-destructive' :
                              getExpiryWarning(currentEmployee.emirates_id_expiry)?.type === 'urgent' ? 'bg-amber-500/20 text-amber-400' : 'bg-yellow-500/20 text-yellow-400'
                            )}>
                              {getExpiryWarning(currentEmployee.emirates_id_expiry)?.text}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Passport no.</p>
                        <p className="text-lg font-semibold text-foreground">{currentEmployee.passport_no || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Passport expiry</p>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold text-primary">
                            {currentEmployee.passport_expiry 
                              ? new Date(currentEmployee.passport_expiry).toLocaleDateString('en-GB')
                              : 'Not set'}
                          </p>
                          {getExpiryWarning(currentEmployee.passport_expiry) && (
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-xs",
                              getExpiryWarning(currentEmployee.passport_expiry)?.type === 'expired' ? 'bg-destructive/20 text-destructive' :
                              getExpiryWarning(currentEmployee.passport_expiry)?.type === 'urgent' ? 'bg-amber-500/20 text-amber-400' : 'bg-yellow-500/20 text-yellow-400'
                            )}>
                              {getExpiryWarning(currentEmployee.passport_expiry)?.text}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Button 
                      className="bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full"
                      onClick={() => {
                        setActiveTab('documents');
                      }}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Upload visa copy
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Leave Tab */}
            {activeTab === 'leave' && (
              <div className="space-y-6 animate-fade-in">
                <div className="glass-card rounded-2xl border border-border p-5">
                  <h3 className="text-lg font-semibold text-foreground mb-4">LEAVE HISTORY</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Annual entitlement</p>
                        <p className="text-lg font-semibold text-foreground">30 days / year</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current balance</p>
                        <p className="text-lg font-semibold text-foreground">{currentEmployee.leave_balance || 0} days</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Recent leave requests</h4>
                    {employeeLeaveRecords.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No leave records found</p>
                    ) : (
                      <div className="space-y-2">
                        {employeeLeaveRecords.slice(0, 5).map((record) => (
                          <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
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
                  </div>

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
                  {/* Animated Emirates ID at top center */}
                  <div className="flex justify-center mb-6">
                    <img 
                      src={emiratesIdCard} 
                      alt="Emirates ID" 
                      className="w-32 h-auto animate-float drop-shadow-lg"
                    />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-foreground mb-4 text-center">EMPLOYEE DOCUMENTS</h3>
                  
                  <div 
                    className="file-drop-area p-8 text-center mb-6 border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="mb-4">
                      <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                    </div>
                    <p className="text-lg font-semibold text-foreground mb-2">Drag & drop files here</p>
                    <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                    <p className="text-xs text-muted-foreground">Supported: JPG, PNG, PDF, XLSX, DOC, DOCX (Max 10MB)</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.pdf,.xlsx,.xls,.doc,.docx"
                      onChange={(e) => handleFileUpload(e)}
                      className="hidden"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-foreground">Uploaded Documents</h4>
                      <span className="text-xs text-muted-foreground">{documents.length} files</span>
                    </div>
                    
                    {documents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No documents uploaded yet</p>
                        <p className="text-xs mt-1">Upload files to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{getFileIcon(doc.file_type)}</span>
                              <div>
                                <p className="text-sm font-medium text-foreground">{doc.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {doc.file_size} • {format(parseISO(doc.created_at), 'dd MMM yyyy')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                              >
                                <Download className="w-4 h-4 text-muted-foreground" />
                              </a>
                              <button
                                onClick={() => handleDeleteDocument(doc.id, doc.file_url)}
                                className="p-2 rounded-lg hover:bg-destructive/20 transition-colors"
                              >
                                <X className="w-4 h-4 text-destructive" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* EOS Tab */}
            {activeTab === 'eos' && (
              <div className="space-y-6 animate-fade-in">
                <div className="glass-card rounded-2xl border border-border p-5">
                  <h3 className="text-lg font-semibold text-foreground mb-4">END OF SERVICE (EOS)</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Service start date</p>
                        <p className="text-lg font-semibold text-foreground">
                          {new Date(currentEmployee.joining_date).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Service length (today)</p>
                        <p className="text-2xl font-bold text-foreground">{calculateServiceLength()}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Gratuity basis</p>
                        <p className="text-lg font-semibold text-foreground">Basic salary only</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current estimate</p>
                        <p className="text-2xl font-bold text-primary">AED {estimateGratuity().toLocaleString()} (approx.)</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary/30">
                    <h4 className="text-sm font-semibold text-foreground mb-2">Calculation summary (for reference):</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• First 5 years: 21 days per year of basic salary.</li>
                      <li>• After 5 years: 30 days per year (if applicable).</li>
                      <li>• Exact entitlement depends on termination reason and UAE labour law.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Modal */}
      {currentEmployee && (
        <EditEmployeeModal
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            refetchEmployees();
          }}
          employee={currentEmployee}
        />
      )}

      {/* Leave Request Modal */}
      {currentEmployee && (
        <LeaveRequestModal
          isOpen={isLeaveOpen}
          onClose={() => setIsLeaveOpen(false)}
          employeeId={currentEmployee.id}
          employeeName={currentEmployee.full_name}
        />
      )}
    </>
  );
}
