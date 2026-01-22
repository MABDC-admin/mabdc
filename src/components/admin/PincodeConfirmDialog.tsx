import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2, Lock } from 'lucide-react';

const ADMIN_PINCODE = '192168';

interface PincodeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  isLoading?: boolean;
  destructive?: boolean;
}

export function PincodeConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isLoading = false,
  destructive = true,
}: PincodeConfirmDialogProps) {
  const [pincode, setPincode] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setPincode('');
      setError('');
    }
  }, [open]);

  const handleConfirm = () => {
    if (pincode !== ADMIN_PINCODE) {
      setError('Incorrect pincode. Please try again.');
      setAttempts(prev => prev + 1);
      setPincode('');
      return;
    }
    
    setError('');
    onConfirm();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pincode.length === 6) {
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destructive ? (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            ) : (
              <Lock className="w-5 h-5 text-primary" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pincode" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Enter Admin Pincode
            </Label>
            <Input
              id="pincode"
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={pincode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setPincode(value);
                if (error) setError('');
              }}
              onKeyDown={handleKeyDown}
              className={error ? 'border-destructive' : ''}
              autoFocus
              disabled={isLoading}
            />
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {error}
                {attempts >= 3 && ' Contact your administrator if you forgot the pincode.'}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={pincode.length !== 6 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
