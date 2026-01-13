import { useCompanySettings } from "@/hooks/useSettings";
import { Building2 } from "lucide-react";

interface CompanyBrandingHeaderProps {
  fallbackTitle?: string;
  fallbackIcon?: React.ReactNode;
  className?: string;
}

export function CompanyBrandingHeader({ 
  fallbackTitle = "Portal", 
  fallbackIcon,
  className = ""
}: CompanyBrandingHeaderProps) {
  const { data: settings, isLoading } = useCompanySettings();

  const logoUrl = settings?.logo_url;
  const companyName = settings?.company_name || fallbackTitle;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {isLoading ? (
        <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
      ) : logoUrl ? (
        <img 
          src={logoUrl} 
          alt={companyName}
          className="w-16 h-16 object-contain rounded-lg"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          {fallbackIcon || <Building2 className="w-8 h-8 text-primary" />}
        </div>
      )}
      <h1 className="text-xl font-semibold text-foreground">{companyName}</h1>
    </div>
  );
}
