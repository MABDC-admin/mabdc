import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useEmployees } from '@/hooks/useEmployees';
import { 
  VisaApplication, 
  useCreateVisaApplication, 
  useUpdateVisaApplication,
  useMoveToNextStage,
  useVisaStageHistory,
  canMoveToNextStage,
  getDaysInStage
} from '@/hooks/useVisaProcess';
import { VISA_TYPES, VISA_STAGES, getStageById, isNonSkilledPosition } from '@/constants/visaStages';
import { format } from 'date-fns';
import { 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';

const createSchema = z.object({
  employee_id: z.string().min(1, 'Employee is required'),
  visa_type: z.string().min(1, 'Visa type is required'),
  tawjeeh_required: z.boolean().default(false),
  notes: z.string().optional()
});

interface VisaApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application?: VisaApplication | null;
  mode: 'create' | 'edit';
}

export const VisaApplicationModal = ({
  open,
  onOpenChange,
  application,
  mode
}: VisaApplicationModalProps) => {
  const [activeTab, setActiveTab] = useState('details');
  const { data: employees = [] } = useEmployees();
  const createMutation = useCreateVisaApplication();
  const updateMutation = useUpdateVisaApplication();
  const moveToNextMutation = useMoveToNextStage();
  const { data: history = [] } = useVisaStageHistory(application?.id || '');
  
  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      employee_id: '',
      visa_type: 'Employment',
      tawjeeh_required: false,
      notes: ''
    }
  });

  // Watch employee selection to auto-set tawjeeh
  const selectedEmployeeId = form.watch('employee_id');
  useEffect(() => {
    if (selectedEmployeeId) {
      const employee = employees.find(e => e.id === selectedEmployeeId);
      if (employee) {
        const required = isNonSkilledPosition(employee.job_position);
        form.setValue('tawjeeh_required', required);
      }
    }
  }, [selectedEmployeeId, employees, form]);

  const handleSubmit = async (data: z.infer<typeof createSchema>) => {
    if (mode === 'create') {
      await createMutation.mutateAsync({
        employee_id: data.employee_id,
        visa_type: data.visa_type,
        tawjeeh_required: data.tawjeeh_required,
        notes: data.notes
      });
    }
    onOpenChange(false);
    form.reset();
  };

  const handleUpdateField = async (field: string, value: any) => {
    if (!application) return;
    await updateMutation.mutateAsync({
      id: application.id,
      [field]: value
    });
  };

  const handleMoveToNext = async () => {
    if (!application) return;
    const skipTawjeeh = !application.tawjeeh_required;
    await moveToNextMutation.mutateAsync({
      applicationId: application.id,
      currentStage: application.current_stage,
      skipTawjeeh
    });
  };

  const currentStage = application ? getStageById(application.current_stage) : null;
  const moveCheck = application ? canMoveToNextStage(application) : { canMove: false };

  const renderStageForm = () => {
    if (!application) return null;

    switch (application.current_stage) {
      case 'mohre_application':
        return (
          <div className="space-y-4">
            <FormItem>
              <FormLabel>MOHRE Status</FormLabel>
              <Select
                value={application.mohre_status || 'Pending'}
                onValueChange={(v) => handleUpdateField('mohre_status', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem>
              <FormLabel>Application Number</FormLabel>
              <Input
                value={application.mohre_application_no || ''}
                onChange={(e) => handleUpdateField('mohre_application_no', e.target.value)}
                placeholder="Enter MOHRE application number"
              />
            </FormItem>
          </div>
        );

      case 'labour_card_payment':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <FormLabel>Payment Completed</FormLabel>
              <Switch
                checked={application.labour_card_paid || false}
                onCheckedChange={(v) => handleUpdateField('labour_card_paid', v)}
              />
            </div>
            <FormItem>
              <FormLabel>Payment Date</FormLabel>
              <Input
                type="date"
                value={application.labour_card_payment_date || ''}
                onChange={(e) => handleUpdateField('labour_card_payment_date', e.target.value)}
              />
            </FormItem>
            <FormItem>
              <FormLabel>Amount (AED)</FormLabel>
              <Input
                type="number"
                value={application.labour_card_amount || ''}
                onChange={(e) => handleUpdateField('labour_card_amount', parseFloat(e.target.value))}
                placeholder="Enter amount"
              />
            </FormItem>
          </div>
        );

      case 'immigration_processing':
        return (
          <div className="space-y-4">
            <FormItem>
              <FormLabel>Immigration Status</FormLabel>
              <Select
                value={application.immigration_status || 'Pending'}
                onValueChange={(v) => handleUpdateField('immigration_status', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem>
              <FormLabel>Expected Completion Date</FormLabel>
              <Input
                type="date"
                value={application.immigration_expected_date || ''}
                onChange={(e) => handleUpdateField('immigration_expected_date', e.target.value)}
              />
            </FormItem>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Immigration processing typically takes up to 2 months
              </p>
            </div>
          </div>
        );

      case 'tawjeeh':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <FormLabel>Tawjeeh Required</FormLabel>
              <Switch
                checked={application.tawjeeh_required || false}
                onCheckedChange={(v) => handleUpdateField('tawjeeh_required', v)}
              />
            </div>
            {application.tawjeeh_required && (
              <div className="flex items-center justify-between">
                <FormLabel>Tawjeeh Completed</FormLabel>
                <Switch
                  checked={application.tawjeeh_completed || false}
                  onCheckedChange={(v) => handleUpdateField('tawjeeh_completed', v)}
                />
              </div>
            )}
          </div>
        );

      case 'medical_examination':
        return (
          <div className="space-y-4">
            <FormItem>
              <FormLabel>Medical Status</FormLabel>
              <Select
                value={application.medical_status || 'Pending'}
                onValueChange={(v) => handleUpdateField('medical_status', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="Passed">Passed</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem>
              <FormLabel>Scheduled Date</FormLabel>
              <Input
                type="date"
                value={application.medical_scheduled_date || ''}
                onChange={(e) => handleUpdateField('medical_scheduled_date', e.target.value)}
              />
            </FormItem>
            <FormItem>
              <FormLabel>Result Notes</FormLabel>
              <Textarea
                value={application.medical_result || ''}
                onChange={(e) => handleUpdateField('medical_result', e.target.value)}
                placeholder="Enter medical examination results"
              />
            </FormItem>
          </div>
        );

      case 'daman_insurance':
        return (
          <div className="space-y-4">
            <FormItem>
              <FormLabel>Daman Status</FormLabel>
              <Select
                value={application.daman_status || 'Pending'}
                onValueChange={(v) => handleUpdateField('daman_status', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Applied">Applied</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem>
              <FormLabel>Policy Number</FormLabel>
              <Input
                value={application.daman_policy_no || ''}
                onChange={(e) => handleUpdateField('daman_policy_no', e.target.value)}
                placeholder="Enter Daman policy number"
              />
            </FormItem>
          </div>
        );

      case 'residence_visa':
        return (
          <div className="space-y-4">
            <FormItem>
              <FormLabel>Residence Visa Status</FormLabel>
              <Select
                value={application.residence_visa_status || 'Pending'}
                onValueChange={(v) => handleUpdateField('residence_visa_status', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Applied">Applied</SelectItem>
                  <SelectItem value="Stamped">Stamped</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem>
              <FormLabel>Visa Number</FormLabel>
              <Input
                value={application.residence_visa_no || ''}
                onChange={(e) => handleUpdateField('residence_visa_no', e.target.value)}
                placeholder="Enter residence visa number"
              />
            </FormItem>
            <Separator />
            <div className="flex items-center justify-between">
              <FormLabel>Emirates ID Applied</FormLabel>
              <Switch
                checked={application.emirates_id_applied || false}
                onCheckedChange={(v) => handleUpdateField('emirates_id_applied', v)}
              />
            </div>
            <FormItem>
              <FormLabel>Emirates ID Reference</FormLabel>
              <Input
                value={application.emirates_id_ref_no || ''}
                onChange={(e) => handleUpdateField('emirates_id_ref_no', e.target.value)}
                placeholder="Enter Emirates ID reference number"
              />
            </FormItem>
          </div>
        );

      case 'onboarding':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <FormLabel>Onboarding Completed</FormLabel>
              <Switch
                checked={application.onboarding_completed || false}
                onCheckedChange={(v) => handleUpdateField('onboarding_completed', v)}
              />
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">
                Final Stage Checklist
              </h4>
              <ul className="text-sm space-y-1 text-green-600 dark:text-green-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Employee profile activated
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Payroll eligibility confirmed
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  HR onboarding complete
                </li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (mode === 'create') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start New Visa Process</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="employee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees
                          .filter(e => e.status === 'Active' || !e.status)
                          .map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.full_name} - {employee.job_position}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="visa_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visa Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VISA_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tawjeeh_required"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Tawjeeh Required</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Required for non-skilled positions
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Add any notes..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Start Visa Process'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }

  // Edit mode
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{application?.employees?.full_name}</span>
            <Badge variant="outline">{application?.visa_type}</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Stage Details</TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {/* Current stage info */}
              <div className="p-4 bg-muted rounded-lg mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Stage</p>
                    <p className="font-semibold text-lg">{currentStage?.name}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {application && getDaysInStage(application.stage_entered_at)} days
                  </div>
                </div>
              </div>
              
              {/* Stage progress */}
              <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
                {VISA_STAGES.map((stage, index) => {
                  const isActive = stage.id === application?.current_stage;
                  const isPast = stage.order < (currentStage?.order || 0);
                  const isSkipped = stage.id === 'tawjeeh' && !application?.tawjeeh_required;
                  
                  return (
                    <div key={stage.id} className="flex items-center">
                      <div
                        className={cn(
                          'h-2 w-8 rounded-full transition-colors',
                          isActive && 'bg-primary',
                          isPast && 'bg-green-500',
                          !isActive && !isPast && 'bg-muted',
                          isSkipped && 'bg-muted opacity-50'
                        )}
                      />
                      {index < VISA_STAGES.length - 1 && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Stage form */}
              {renderStageForm()}
              
              {/* Notes */}
              <div className="mt-6">
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <Textarea
                    value={application?.notes || ''}
                    onChange={(e) => handleUpdateField('notes', e.target.value)}
                    placeholder="Add notes about this visa process..."
                    rows={3}
                  />
                </FormItem>
              </div>
            </ScrollArea>
            
            {/* Move to next stage button */}
            {application?.current_stage !== 'onboarding' && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    {!moveCheck.canMove && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <XCircle className="h-4 w-4 text-destructive" />
                        {moveCheck.reason}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleMoveToNext}
                    disabled={!moveCheck.canMove || moveToNextMutation.isPending}
                  >
                    Move to Next Stage
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-[400px]">
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No history yet
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div key={item.id} className="flex gap-3 p-3 border rounded-lg">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <ChevronRight className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {item.from_stage ? (
                            <>
                              {getStageById(item.from_stage)?.name} → {getStageById(item.to_stage)?.name}
                            </>
                          ) : (
                            `Started at ${getStageById(item.to_stage)?.name}`
                          )}
                        </p>
                        {item.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(item.created_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
