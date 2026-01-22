import { useEmailHistory } from "@/hooks/useEmailHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface EmailHistorySectionProps {
  emailType?: string;
  maxHeight?: string;
}

export function EmailHistorySection({ emailType = "payslip", maxHeight = "400px" }: EmailHistorySectionProps) {
  const { data: emailHistory, isLoading, refetch } = useEmailHistory(emailType);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email History
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ maxHeight }}>
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : !emailHistory || emailHistory.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No emails sent yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {emailHistory.map((email) => (
                <div key={email.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={email.employees?.photo_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {email.employees?.full_name ? getInitials(email.employees.full_name) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">
                          {email.employees?.full_name || "Unknown"}
                        </p>
                        {getStatusBadge(email.status)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {email.recipient_email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {email.subject}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(email.sent_at), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        {email.error_message && (
                          <span className="text-xs text-red-500 truncate max-w-[200px]" title={email.error_message}>
                            {email.error_message}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
