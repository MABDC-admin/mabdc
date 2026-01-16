import { useMemo } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { useCompanySettings } from '@/hooks/useSettings';
import { useContracts } from '@/hooks/useContracts';
import { useDocumentRenewalQueue } from '@/hooks/useDocumentRenewalQueue';
import type { Employee } from '@/types/hr';

export interface ExpiryPriorityInfo {
  employeeId: string;
  priorityScore: number; // Lower = more urgent (0 = critical, 100+ = no issues)
  urgencyLevel: 'critical' | 'warning' | 'upcoming' | 'none';
  expiringDocuments: ExpiringDocument[];
  hasExpiringItems: boolean;
  mostUrgentDays: number | null;
}

export interface ExpiringDocument {
  type: string;
  name: string;
  daysRemaining: number;
  expiryDate: string;
  source: 'employee' | 'document' | 'contract';
}

interface UseDocumentExpiryPriorityOptions {
  visaThresholdDays?: number;
  contractThresholdDays?: number;
  documentThresholdDays?: number;
}

/**
 * Hook to calculate document expiry priority for employees.
 * Returns a map of employee IDs to their priority information.
 * Lower priorityScore = more urgent action needed.
 */
export function useDocumentExpiryPriority(
  employees: Employee[],
  options: UseDocumentExpiryPriorityOptions = {}
) {
  const { data: companySettings } = useCompanySettings();
  const { data: contracts = [] } = useContracts();
  
  // Get configurable threshold (default 30 days)
  const defaultThreshold = companySettings?.expiry_notification_days || 30;
  
  const {
    visaThresholdDays = defaultThreshold,
    contractThresholdDays = defaultThreshold * 2, // Contracts typically need more lead time
    documentThresholdDays = defaultThreshold,
  } = options;

  // Fetch renewal queue with a wide threshold to capture all relevant items
  const { data: renewalQueue = [] } = useDocumentRenewalQueue(Math.max(visaThresholdDays, contractThresholdDays, documentThresholdDays, 90));

  const priorityMap = useMemo(() => {
    const map = new Map<string, ExpiryPriorityInfo>();
    const today = new Date();

    employees.forEach((employee) => {
      const expiringDocuments: ExpiringDocument[] = [];
      
      // Check visa expiration
      if (employee.visa_expiration) {
        const daysRemaining = differenceInDays(parseISO(employee.visa_expiration), today);
        if (daysRemaining <= visaThresholdDays) {
          expiringDocuments.push({
            type: 'Visa',
            name: 'UAE Visa',
            daysRemaining,
            expiryDate: employee.visa_expiration,
            source: 'employee',
          });
        }
      }

      // Check Emirates ID expiration
      if (employee.emirates_id_expiry) {
        const daysRemaining = differenceInDays(parseISO(employee.emirates_id_expiry), today);
        if (daysRemaining <= documentThresholdDays) {
          expiringDocuments.push({
            type: 'Emirates ID',
            name: 'Emirates ID Card',
            daysRemaining,
            expiryDate: employee.emirates_id_expiry,
            source: 'employee',
          });
        }
      }

      // Check passport expiration
      if (employee.passport_expiry) {
        const daysRemaining = differenceInDays(parseISO(employee.passport_expiry), today);
        if (daysRemaining <= documentThresholdDays) {
          expiringDocuments.push({
            type: 'Passport',
            name: 'Passport',
            daysRemaining,
            expiryDate: employee.passport_expiry,
            source: 'employee',
          });
        }
      }

      // Check contract expiration
      const employeeContracts = contracts.filter(c => c.employee_id === employee.id);
      const activeContract = employeeContracts.find(c => 
        c.status === 'Active' || c.status === 'Approved'
      );
      
      if (activeContract?.end_date) {
        const daysRemaining = differenceInDays(parseISO(activeContract.end_date), today);
        if (daysRemaining <= contractThresholdDays) {
          expiringDocuments.push({
            type: 'Contract',
            name: `${activeContract.contract_type} Contract`,
            daysRemaining,
            expiryDate: activeContract.end_date,
            source: 'contract',
          });
        }
      }

      // Check documents from renewal queue
      const employeeQueueItems = renewalQueue.filter(item => 
        item.employee_id === employee.id && 
        item.source === 'document' && 
        !item.is_renewed &&
        item.days_remaining <= documentThresholdDays
      );
      
      employeeQueueItems.forEach(item => {
        // Avoid duplicates (visa, eid, passport already handled above)
        const isDuplicate = expiringDocuments.some(
          doc => doc.type === item.document_type && doc.source === 'employee'
        );
        if (!isDuplicate) {
          expiringDocuments.push({
            type: item.document_type,
            name: item.document_name,
            daysRemaining: item.days_remaining,
            expiryDate: item.expiry_date,
            source: 'document',
          });
        }
      });

      // Calculate priority score (lower = more urgent)
      // Expired items: score based on how overdue (-30 days = 0, 0 days = 30)
      // Upcoming items: score based on days remaining
      let priorityScore = 100; // Default: no urgency
      
      if (expiringDocuments.length > 0) {
        const mostUrgent = Math.min(...expiringDocuments.map(d => d.daysRemaining));
        
        if (mostUrgent < 0) {
          // Expired: 0-30 based on how overdue (more overdue = lower score)
          priorityScore = Math.max(0, 30 + mostUrgent);
        } else if (mostUrgent <= 7) {
          // Critical: 30-40 based on days remaining
          priorityScore = 30 + mostUrgent;
        } else if (mostUrgent <= 30) {
          // Warning: 40-70 based on days remaining
          priorityScore = 40 + mostUrgent;
        } else {
          // Upcoming: 70-100 based on days remaining
          priorityScore = 70 + Math.min(30, mostUrgent - 30);
        }
      }

      // Determine urgency level
      let urgencyLevel: 'critical' | 'warning' | 'upcoming' | 'none' = 'none';
      const mostUrgentDays = expiringDocuments.length > 0 
        ? Math.min(...expiringDocuments.map(d => d.daysRemaining)) 
        : null;
      
      if (mostUrgentDays !== null) {
        if (mostUrgentDays < 0 || mostUrgentDays <= 7) {
          urgencyLevel = 'critical';
        } else if (mostUrgentDays <= 30) {
          urgencyLevel = 'warning';
        } else {
          urgencyLevel = 'upcoming';
        }
      }

      map.set(employee.id, {
        employeeId: employee.id,
        priorityScore,
        urgencyLevel,
        expiringDocuments,
        hasExpiringItems: expiringDocuments.length > 0,
        mostUrgentDays,
      });
    });

    return map;
  }, [employees, contracts, renewalQueue, visaThresholdDays, contractThresholdDays, documentThresholdDays]);

  // Helper function to sort employees by priority
  const sortByPriority = useMemo(() => {
    return (employeeList: Employee[]): Employee[] => {
      return [...employeeList].sort((a, b) => {
        const priorityA = priorityMap.get(a.id)?.priorityScore ?? 100;
        const priorityB = priorityMap.get(b.id)?.priorityScore ?? 100;
        
        // Sort by priority score (lower first)
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        // If same priority, sort alphabetically by name
        return a.full_name.localeCompare(b.full_name);
      });
    };
  }, [priorityMap]);

  // Get all employees with expiring documents, sorted by urgency
  const employeesWithExpiringDocs = useMemo(() => {
    return employees
      .filter(emp => priorityMap.get(emp.id)?.hasExpiringItems)
      .sort((a, b) => {
        const priorityA = priorityMap.get(a.id)?.priorityScore ?? 100;
        const priorityB = priorityMap.get(b.id)?.priorityScore ?? 100;
        return priorityA - priorityB;
      });
  }, [employees, priorityMap]);

  // Summary statistics
  const stats = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let upcoming = 0;
    
    priorityMap.forEach((info) => {
      if (info.urgencyLevel === 'critical') critical++;
      else if (info.urgencyLevel === 'warning') warning++;
      else if (info.urgencyLevel === 'upcoming') upcoming++;
    });

    return { critical, warning, upcoming, total: critical + warning + upcoming };
  }, [priorityMap]);

  return {
    priorityMap,
    sortByPriority,
    employeesWithExpiringDocs,
    stats,
    getPriority: (employeeId: string) => priorityMap.get(employeeId),
  };
}

/**
 * Get urgency badge styling based on urgency level
 */
export function getUrgencyBadgeStyles(urgencyLevel: 'critical' | 'warning' | 'upcoming' | 'none') {
  switch (urgencyLevel) {
    case 'critical':
      return {
        bg: 'bg-destructive/10',
        text: 'text-destructive',
        border: 'border-destructive/30',
        icon: 'text-destructive',
        pulse: true,
      };
    case 'warning':
      return {
        bg: 'bg-amber-500/10',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-500/30',
        icon: 'text-amber-500',
        pulse: false,
      };
    case 'upcoming':
      return {
        bg: 'bg-blue-500/10',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-500/30',
        icon: 'text-blue-500',
        pulse: false,
      };
    default:
      return {
        bg: 'bg-muted',
        text: 'text-muted-foreground',
        border: 'border-border',
        icon: 'text-muted-foreground',
        pulse: false,
      };
  }
}

/**
 * Format days remaining as human-readable text
 */
export function formatDaysRemaining(days: number): string {
  if (days < 0) {
    return `${Math.abs(days)}d overdue`;
  } else if (days === 0) {
    return 'Today';
  } else if (days === 1) {
    return '1 day left';
  } else {
    return `${days}d left`;
  }
}
