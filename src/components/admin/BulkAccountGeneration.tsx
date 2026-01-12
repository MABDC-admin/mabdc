import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useEmployees } from '@/hooks/useEmployees';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Play, CheckCircle2, XCircle, Download, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GeneratedAccount {
  employeeId: string;
  employeeName: string;
  email: string;
  password: string;
  success: boolean;
  error?: string;
}

export function BulkAccountGeneration() {
  const { data: employees = [], refetch } = useEmployees();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<GeneratedAccount[]>([]);

  // Filter employees without accounts
  const employeesWithoutAccounts = employees.filter(emp => !(emp as any).user_id);
  const employeesWithAccounts = employees.filter(emp => !!(emp as any).user_id);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleBulkGenerate = async () => {
    if (employeesWithoutAccounts.length === 0) {
      toast.info('All employees already have accounts');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setResults([]);

    const generatedAccounts: GeneratedAccount[] = [];
    const total = employeesWithoutAccounts.length;

    for (let i = 0; i < total; i++) {
      const employee = employeesWithoutAccounts[i];
      const password = generatePassword();

      try {
        // Call the edge function to create account (uses admin API, won't affect current session)
        const response = await supabase.functions.invoke('create-employee-account', {
          body: {
            employeeId: employee.id,
            employeeName: employee.full_name,
            workEmail: employee.work_email,
            password,
          },
        });

        if (response.error) {
          throw new Error(response.error.message || 'Failed to create account');
        }

        if (response.data?.error) {
          throw new Error(response.data.error);
        }

        generatedAccounts.push({
          employeeId: employee.id,
          employeeName: employee.full_name,
          email: employee.work_email,
          password,
          success: true,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        generatedAccounts.push({
          employeeId: employee.id,
          employeeName: employee.full_name,
          email: employee.work_email,
          password,
          success: false,
          error: errorMessage,
        });
      }

      setProgress(Math.round(((i + 1) / total) * 100));
      setResults([...generatedAccounts]);
    }

    setIsGenerating(false);
    refetch();

    const successCount = generatedAccounts.filter(a => a.success).length;
    const failCount = generatedAccounts.filter(a => !a.success).length;

    if (successCount > 0) {
      toast.success(`Created ${successCount} accounts successfully`);
    }
    if (failCount > 0) {
      toast.error(`Failed to create ${failCount} accounts`);
    }
  };

  const downloadCredentials = () => {
    const successfulAccounts = results.filter(r => r.success);
    if (successfulAccounts.length === 0) {
      toast.error('No successful accounts to download');
      return;
    }

    const csv = [
      ['Employee Name', 'Email', 'Temporary Password'],
      ...successfulAccounts.map(a => [a.employeeName, a.email, a.password]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-credentials-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Credentials downloaded');
  };

  return (
    <>
      <Button
        variant="outline"
        className="border-primary/50 text-primary hover:bg-primary/10"
        onClick={() => setIsOpen(true)}
        disabled={employeesWithoutAccounts.length === 0}
      >
        <Users className="w-4 h-4 mr-2" />
        Bulk Generate Accounts
        {employeesWithoutAccounts.length > 0 && (
          <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 text-xs">
            {employeesWithoutAccounts.length}
          </span>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Bulk Account Generation
            </DialogTitle>
            <DialogDescription>
              Generate login accounts for all employees without existing accounts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground">Without Accounts</p>
                <p className="text-2xl font-bold text-foreground">{employeesWithoutAccounts.length}</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground">With Accounts</p>
                <p className="text-2xl font-bold text-primary">{employeesWithAccounts.length}</p>
              </div>
            </div>

            {/* Progress */}
            {isGenerating && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Generating accounts...</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Results</p>
                  <Button variant="outline" size="sm" onClick={downloadCredentials}>
                    <Download className="w-4 h-4 mr-1" />
                    Download CSV
                  </Button>
                </div>
                <ScrollArea className="h-48 rounded-xl border border-border">
                  <div className="p-3 space-y-2">
                    {results.map((result, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                          result.success ? 'bg-primary/10' : 'bg-destructive/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                          <span className="font-medium">{result.employeeName}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {result.success ? result.email : result.error}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            <Button
              onClick={handleBulkGenerate}
              disabled={isGenerating || employeesWithoutAccounts.length === 0}
              className="bg-primary"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Generate {employeesWithoutAccounts.length} Accounts
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
