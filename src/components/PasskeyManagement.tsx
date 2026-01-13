import { useEffect, useState } from 'react';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Fingerprint, Plus, Trash2, Smartphone, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';

export function PasskeyManagement() {
  const { isSupported, isLoading, passkeys, fetchPasskeys, registerPasskey, deletePasskey } = useWebAuthn();
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPasskeys();
  }, [fetchPasskeys]);

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      const success = await registerPasskey(deviceName || undefined);
      if (success) {
        setShowRegisterDialog(false);
        setDeviceName('');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteDialog) return;
    
    setIsDeleting(true);
    try {
      await deletePasskey(showDeleteDialog);
      setShowDeleteDialog(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const getDeviceIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('iphone') || lowerName.includes('android') || lowerName.includes('mobile') || lowerName.includes('phone')) {
      return Smartphone;
    }
    return Fingerprint;
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5" />
            Biometric Login
          </CardTitle>
          <CardDescription>Use fingerprint or Face ID to sign in quickly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="font-medium text-sm">Not Supported</p>
              <p className="text-xs text-muted-foreground">
                Biometric authentication is not available on this device or browser.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Fingerprint className="w-5 h-5" />
                Biometric Login
              </CardTitle>
              <CardDescription>Use fingerprint or Face ID to sign in quickly</CardDescription>
            </div>
            <Button onClick={() => setShowRegisterDialog(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Device
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {passkeys.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="font-medium">No Passkeys Registered</p>
                <p className="text-sm text-muted-foreground">
                  Add a passkey to enable quick sign-in with your fingerprint or Face ID
                </p>
              </div>
              <Button onClick={() => setShowRegisterDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Set Up Biometric Login
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {passkeys.map((passkey) => {
                const DeviceIcon = getDeviceIcon(passkey.device_name);
                return (
                  <div
                    key={passkey.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <DeviceIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{passkey.device_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Added {format(parseISO(passkey.created_at), 'dd MMM yyyy')}</span>
                          {passkey.last_used_at && (
                            <>
                              <span>•</span>
                              <span>Last used {formatDistanceToNow(parseISO(passkey.last_used_at), { addSuffix: true })}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowDeleteDialog(passkey.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Register Passkey Dialog */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5" />
              Set Up Biometric Login
            </DialogTitle>
            <DialogDescription>
              Register this device to enable quick sign-in with your fingerprint, Face ID, or device PIN.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="device-name">Device Name (optional)</Label>
              <Input
                id="device-name"
                placeholder="e.g., My iPhone, Work Laptop"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Give this device a name to help you identify it later
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm font-medium">What happens next:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Click "Register" below</li>
                <li>Your device will prompt for biometric verification</li>
                <li>Scan your fingerprint or use Face ID</li>
                <li>You're all set!</li>
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegisterDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRegister} disabled={isRegistering}>
              {isRegistering ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Register
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Passkey</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this passkey? You won't be able to use it to sign in anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
