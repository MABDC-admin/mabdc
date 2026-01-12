import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Loader2, Check, Copy, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

interface GenerateEmployeeAccountButtonProps {
  employeeId: string;
  employeeName: string;
  workEmail: string;
  hasAccount: boolean;
  onAccountCreated?: () => void;
}

export function GenerateEmployeeAccountButton({
  employeeId,
  employeeName,
  workEmail,
  hasAccount,
  onAccountCreated,
}: GenerateEmployeeAccountButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleGenerateAccount = async () => {
    setIsLoading(true);
    const password = generatePassword();

    try {
      // Get current session token for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to create employee accounts');
      }

      // Call the edge function to create the account
      const response = await supabase.functions.invoke('create-employee-account', {
        body: {
          employeeId,
          employeeName,
          workEmail,
          password,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create account');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setGeneratedPassword(password);
      toast.success('Employee account created successfully!');
      onAccountCreated?.();
    } catch (error: unknown) {
      console.error('Error creating account:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
      toast.error(errorMessage);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`Email: ${workEmail}\nPassword: ${generatedPassword}`);
    setCopied(true);
    toast.success('Credentials copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setIsOpen(false);
    setGeneratedPassword('');
    setCopied(false);
  };

  if (hasAccount) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Check className="w-4 h-4 mr-2" />
        Account Active
      </Button>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <UserPlus className="w-4 h-4 mr-2" />
        Generate Account
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Employee Account</DialogTitle>
            <DialogDescription>
              Create a login account for {employeeName} to access the Employee Self-Service Portal.
            </DialogDescription>
          </DialogHeader>

          {!generatedPassword ? (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Employee Name</Label>
                  <Input value={employeeName} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Work Email (Login)</Label>
                  <Input value={workEmail} disabled />
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Note:</strong> A temporary password will be generated. Share it securely with the employee and ask them to change it on first login.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleGenerateAccount} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 mr-2" />
                      Generate Account
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                    <strong>✓ Account created successfully!</strong>
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Share these credentials securely with the employee.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Login Email</Label>
                  <Input value={workEmail} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Temporary Password</Label>
                  <div className="flex gap-2">
                    <Input value={generatedPassword} readOnly className="font-mono" />
                    <Button variant="outline" size="icon" onClick={copyToClipboard}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={copyToClipboard} variant="outline">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Credentials
                </Button>
                <Button onClick={handleClose}>
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
