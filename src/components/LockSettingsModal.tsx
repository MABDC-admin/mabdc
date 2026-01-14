import { useState, useRef } from 'react';
import { Lock, ShieldCheck, Trash2, Edit, Eye, EyeOff, Image as ImageIcon, RotateCcw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface LockSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasCode: boolean;
  backgroundImage: string | null;
  onSetCode: (code: string) => boolean;
  onChangeCode: (oldCode: string, newCode: string) => boolean;
  onRemoveCode: (code: string) => boolean;
  onSetBackground: (file: File) => Promise<boolean>;
  onResetBackground: () => void;
}

export function LockSettingsModal({
  open,
  onOpenChange,
  hasCode,
  backgroundImage,
  onSetCode,
  onChangeCode,
  onRemoveCode,
  onSetBackground,
  onResetBackground,
}: LockSettingsModalProps) {
  const [mode, setMode] = useState<'menu' | 'set' | 'change' | 'remove' | 'background'>('menu');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [oldCode, setOldCode] = useState('');
  const [showCodes, setShowCodes] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setNewCode('');
    setConfirmCode('');
    setOldCode('');
    setShowCodes(false);
    setMode('menu');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSetCode = () => {
    if (newCode !== confirmCode) {
      return;
    }
    if (onSetCode(newCode)) {
      resetForm();
    }
  };

  const handleChangeCode = () => {
    if (newCode !== confirmCode) {
      return;
    }
    if (onChangeCode(oldCode, newCode)) {
      resetForm();
    }
  };

  const handleRemoveCode = () => {
    if (onRemoveCode(oldCode)) {
      resetForm();
    }
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onSetBackground(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {mode === 'menu' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                App Lock Settings
              </DialogTitle>
              <DialogDescription>
                Manage your application lock code for enhanced security
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              {!hasCode ? (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      No Lock Code Set
                    </CardTitle>
                    <CardDescription>
                      Set a 5-digit code to secure your application
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => setMode('set')}
                      className="w-full"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Set Lock Code
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card className="border-green-500/20 bg-green-500/5">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                        <ShieldCheck className="w-4 h-4" />
                        Lock Code Active
                      </CardTitle>
                      <CardDescription>
                        Your application is protected with a lock code
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  <Button
                    onClick={() => setMode('change')}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Change Lock Code
                  </Button>

                  <Button
                    onClick={() => setMode('remove')}
                    variant="outline"
                    className="w-full justify-start text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Lock Code
                  </Button>
                </>
              )}

              {/* Background Customization Section */}
              <div className="pt-2 border-t">
                <Button
                  onClick={() => setMode('background')}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Customize Lock Screen Background
                </Button>
              </div>
            </div>
          </>
        )}

        {mode === 'set' && (
          <>
            <DialogHeader>
              <DialogTitle>Set Lock Code</DialogTitle>
              <DialogDescription>
                Create a 5-digit code to secure your application
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-code">New Lock Code</Label>
                <div className="relative">
                  <Input
                    id="new-code"
                    type={showCodes ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={5}
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="12345"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCodes(!showCodes)}
                  >
                    {showCodes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-code">Confirm Lock Code</Label>
                <Input
                  id="confirm-code"
                  type={showCodes ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={5}
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="12345"
                />
              </div>

              {newCode && confirmCode && newCode !== confirmCode && (
                <p className="text-sm text-destructive">Codes do not match</p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setMode('menu')}>
                Cancel
              </Button>
              <Button
                onClick={handleSetCode}
                disabled={newCode.length !== 5 || newCode !== confirmCode}
              >
                Set Code
              </Button>
            </DialogFooter>
          </>
        )}

        {mode === 'change' && (
          <>
            <DialogHeader>
              <DialogTitle>Change Lock Code</DialogTitle>
              <DialogDescription>
                Enter your current code and set a new one
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="old-code">Current Lock Code</Label>
                <Input
                  id="old-code"
                  type={showCodes ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={5}
                  value={oldCode}
                  onChange={(e) => setOldCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="12345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-code-change">New Lock Code</Label>
                <Input
                  id="new-code-change"
                  type={showCodes ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={5}
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="54321"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-code-change">Confirm New Code</Label>
                <div className="relative">
                  <Input
                    id="confirm-code-change"
                    type={showCodes ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={5}
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="54321"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCodes(!showCodes)}
                  >
                    {showCodes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {newCode && confirmCode && newCode !== confirmCode && (
                <p className="text-sm text-destructive">New codes do not match</p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setMode('menu')}>
                Cancel
              </Button>
              <Button
                onClick={handleChangeCode}
                disabled={
                  oldCode.length !== 5 ||
                  newCode.length !== 5 ||
                  newCode !== confirmCode
                }
              >
                Change Code
              </Button>
            </DialogFooter>
          </>
        )}

        {mode === 'remove' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-destructive">Remove Lock Code</DialogTitle>
              <DialogDescription>
                This will disable the app lock feature. Enter your code to confirm.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="remove-code">Current Lock Code</Label>
                <div className="relative">
                  <Input
                    id="remove-code"
                    type={showCodes ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={5}
                    value={oldCode}
                    onChange={(e) => setOldCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="12345"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCodes(!showCodes)}
                  >
                    {showCodes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    ⚠️ This action cannot be undone. You'll need to set up a new code if you want to use app lock again.
                  </p>
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setMode('menu')}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveCode}
                disabled={oldCode.length !== 5}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Code
              </Button>
            </DialogFooter>
          </>
        )}

        {mode === 'background' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" />
                Lock Screen Background
              </DialogTitle>
              <DialogDescription>
                Customize your lock screen with a personal background image
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Current Background Preview */}
              <div className="space-y-2">
                <Label>Current Background</Label>
                <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-border bg-muted">
                  {backgroundImage ? (
                    <img
                      src={backgroundImage}
                      alt="Lock screen background"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center space-y-2">
                        <ImageIcon className="w-12 h-12 mx-auto" />
                        <p className="text-sm">No custom background set</p>
                        <p className="text-xs">Using default gradient</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Section */}
              <div className="space-y-2">
                <Label>Upload New Background</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleBackgroundUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Image
                </Button>
                <p className="text-xs text-muted-foreground">
                  Supported: JPG, PNG, WebP • Max: 5MB • Min: 1280×720px
                </p>
              </div>

              {/* Reset Button */}
              {backgroundImage && (
                <Button
                  onClick={onResetBackground}
                  variant="outline"
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset to Default
                </Button>
              )}

              {/* Info Card */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">
                    💡 <strong>Tip:</strong> Choose high-quality images with good contrast for the best lock screen experience. The image will be displayed full-screen when the app is locked.
                  </p>
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setMode('menu')}>
                Back to Settings
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
