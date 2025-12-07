import { useState } from 'react';
import { useHRStore } from '@/store/hrStore';
import { useDeleteEmployee } from '@/hooks/useEmployees';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Pencil, Trash2, X, FileText, Upload } from 'lucide-react';
import type { EmployeeDocument } from '@/types/hr';

interface EmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'summary' | 'contract' | 'visa' | 'leave' | 'documents' | 'eos';

export function EmployeeProfileModal({ isOpen, onClose }: EmployeeProfileModalProps) {
  const { currentEmployee, setCurrentEmployee } = useHRStore();
  const deleteEmployee = useDeleteEmployee();
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto glass-card border-border soft-scroll p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-16 h-16 rounded-2xl avatar-gradient flex items-center justify-center text-xl font-bold text-primary-foreground">
                {getInitials(currentEmployee.full_name)}
              </span>
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
              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
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
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">COMPLIANCE FLAGS</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm text-foreground">Contract aligned with UAE labour law</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm text-foreground">Visa & Emirates ID valid</span>
                    </div>
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
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Probation</p>
                      <p className="text-lg font-semibold text-primary">Completed</p>
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
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
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
                      <p className="text-lg font-semibold text-foreground">{currentEmployee.contract_type || 'Unlimited'} (UAE)</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Start date</p>
                      <p className="text-lg font-semibold text-foreground">
                        {new Date(currentEmployee.joining_date).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Weekly hours</p>
                      <p className="text-lg font-semibold text-foreground">48 hours</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">MOHRE contract no.</p>
                      <p className="text-lg font-semibold text-foreground">CNTR-{currentEmployee.hrms_no}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Notice period</p>
                      <p className="text-lg font-semibold text-foreground">30 days</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Overtime policy</p>
                      <p className="text-lg font-semibold text-foreground">As per UAE labour law</p>
                    </div>
                  </div>
                </div>
                <Button className="mt-6 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full">
                  View signed contract (PDF)
                </Button>
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
                      <p className="text-lg font-semibold text-primary">
                        {currentEmployee.visa_expiration 
                          ? new Date(currentEmployee.visa_expiration).toLocaleDateString('en-GB')
                          : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Emirates ID</p>
                      <p className="text-lg font-semibold text-foreground">{currentEmployee.emirates_id || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">EID expiry</p>
                      <p className="text-lg font-semibold text-primary">
                        {currentEmployee.emirates_id_expiry 
                          ? new Date(currentEmployee.emirates_id_expiry).toLocaleDateString('en-GB')
                          : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Passport no.</p>
                      <p className="text-lg font-semibold text-foreground">{currentEmployee.passport_no || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Passport expiry</p>
                      <p className="text-lg font-semibold text-primary">
                        {currentEmployee.passport_expiry 
                          ? new Date(currentEmployee.passport_expiry).toLocaleDateString('en-GB')
                          : 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <Button className="bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full">
                    Upload visa copy
                  </Button>
                  <Button className="bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full">
                    View reminders
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
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sick leave used</p>
                      <p className="text-lg font-semibold text-foreground">2 days</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-foreground mb-3">Recent leave requests</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <span className="text-sm text-foreground">Annual leave – 10 days</span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">Approved</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <span className="text-sm text-foreground">Sick leave – 1 day</span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">Approved</span>
                    </div>
                  </div>
                </div>

                <Button className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
                  Create new leave request
                </Button>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6 animate-fade-in">
              <div className="glass-card rounded-2xl border border-border p-5">
                <h3 className="text-lg font-semibold text-foreground mb-4">EMPLOYEE DOCUMENTS</h3>
                
                <div className="file-drop-area p-8 text-center mb-6">
                  <div className="mb-4">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                  </div>
                  <p className="text-lg font-semibold text-foreground mb-2">Drag & drop files here</p>
                  <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                  <p className="text-xs text-muted-foreground">Supported: JPG, PNG, PDF, XLSX, DOC, DOCX (Max 10MB)</p>
                  <Button className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
                    Browse Files
                  </Button>
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
                            <span className="text-lg">{doc.icon}</span>
                            <div>
                              <p className="text-sm font-medium text-foreground">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">{doc.type} • {doc.size}</p>
                            </div>
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

                <Button className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
                  Open detailed EOS calculator
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
