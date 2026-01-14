import { useState, useRef, useEffect } from 'react';
import { Lock, Unlock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LockScreenProps {
  onUnlock: (code: string) => boolean;
  backgroundImage?: string | null;
  className?: string;
}

export function LockScreen({ onUnlock, backgroundImage, className }: LockScreenProps) {
  const [code, setCode] = useState<string[]>(['', '', '', '', '']);
  const [isShaking, setIsShaking] = useState(false);
  const [showUnlockUI, setShowUnlockUI] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input when unlock UI is shown
    if (showUnlockUI) {
      inputRefs.current[0]?.focus();
    }
  }, [showUnlockUI]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 5 digits are entered
    if (index === 4 && value) {
      const fullCode = [...newCode.slice(0, 4), value].join('');
      setTimeout(() => handleSubmit(fullCode), 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter') {
      handleSubmit(code.join(''));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 5);
    
    if (/^\d{5}$/.test(pastedData)) {
      const newCode = pastedData.split('');
      setCode(newCode);
      inputRefs.current[4]?.focus();
      setTimeout(() => handleSubmit(pastedData), 100);
    }
  };

  const handleSubmit = (fullCode?: string) => {
    const codeToSubmit = fullCode || code.join('');
    
    if (codeToSubmit.length !== 5) {
      triggerShake();
      return;
    }

    const success = onUnlock(codeToSubmit);
    
    if (!success) {
      triggerShake();
      setCode(['', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // Handle click on background to show unlock UI
  const handleBackgroundClick = () => {
    if (!showUnlockUI) {
      setShowUnlockUI(true);
    }
  };

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center cursor-pointer",
        !backgroundImage && "bg-gradient-to-br from-background via-background to-primary/5",
        "backdrop-blur-xl",
        className
      )}
      onClick={handleBackgroundClick}
      style={backgroundImage ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      } : undefined}
    >
      {/* Dark overlay for better contrast */}
      {backgroundImage && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      )}

      {/* Animated background elements (only show when no custom background) */}
      {!backgroundImage && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      )}

      {/* Click to unlock hint - only show when unlock UI is hidden */}
      {!showUnlockUI && (
        <div className="relative z-10 text-center space-y-6 pointer-events-none">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-24 h-24 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/20">
                <Lock className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white drop-shadow-lg">
              Application Locked
            </h2>
            <p className="text-lg text-white/90 drop-shadow flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Click anywhere to unlock
            </p>
          </div>
        </div>
      )}

      {/* Unlock UI - shown after click */}
      {showUnlockUI && (
        <div 
          className={cn(
            "relative glass-card rounded-3xl p-8 sm:p-12 max-w-md w-full mx-4 shadow-2xl",
            "border-2 border-border/50 z-10",
            isShaking && "animate-shake"
          )}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Lock Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <Lock className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Application Locked
          </h2>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Enter your 5-digit code to unlock
          </p>
        </div>

        {/* Code Input */}
        <div className="flex justify-center gap-3 mb-8">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              className={cn(
                "w-14 h-16 text-center text-2xl font-bold rounded-xl",
                "bg-background/50 border-2 border-border",
                "focus:border-primary focus:ring-2 focus:ring-primary/20",
                "transition-all duration-200",
                "outline-none",
                digit && "border-primary bg-primary/5"
              )}
            />
          ))}
        </div>

        {/* Submit Button */}
        <Button
          onClick={() => handleSubmit()}
          className="w-full h-12 text-base font-semibold rounded-xl"
          disabled={code.join('').length !== 5}
        >
          <Unlock className="w-5 h-5 mr-2" />
          Unlock Application
        </Button>

        {/* Help Text */}
        <p className="text-xs text-muted-foreground text-center mt-6">
          Lost your code? Contact your administrator
        </p>
      </div>
      )}
    </div>
  );
}

// Add shake animation to CSS if not already present
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
    20%, 40%, 60%, 80% { transform: translateX(10px); }
  }
  .animate-shake {
    animation: shake 0.5s ease-in-out;
  }
`;
if (!document.querySelector('style[data-lock-screen-styles]')) {
  style.setAttribute('data-lock-screen-styles', 'true');
  document.head.appendChild(style);
}
