
# Plan: Deactivated Employee Data Segregation + Employee Portal Enhancements + Contract Expiry Fixes

## Executive Summary

This plan addresses three major areas:
1. **Data Segregation**: Remove deactivated employees (Resigned/Terminated) from all active views (Payroll, Contracts, Renewal, Time Clock, Attendance)
2. **Employee Portal Enhancements**: Add Education tab with bulk upload capability for school credentials and resume
3. **Contract Expiry Fixes**: Properly link expiry notifications to new contracts and exclude "Contract" from missing documents if uploaded

---

## Part 1: Remove Deactivated Employees from Active Views

### Current State Analysis

**Marlo T. Abrigo** (status: `Terminated`) still appears in:
- Contracts view (has an "Active" contract - should be "Terminated")
- Potentially in Payroll, Renewal queue, and other views

**Root Causes Identified:**

| Hook/View | Current Filter | Issue |
|-----------|---------------|-------|
| `useContracts` | None | Fetches ALL contracts regardless of employee status |
| `usePayroll` | None | Fetches ALL payroll records |
| `useDocumentRenewalQueue` | Checks `employees.status` | But contracts query doesn't filter by employee status |
| `ContractsView` | Uses unfiltered contracts | Shows terminated employees' contracts |
| `RenewalView` | Partial filter | Uses filtered employees but contracts leak through |

### Solution: Add Employee Status Filters

#### 1.1 Update `useContracts` Hook

**File: `src/hooks/useContracts.ts`**

Add filter to exclude contracts where the linked employee is deactivated:

```typescript
export function useContracts() {
  return useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          employees!inner (full_name, photo_url, status)
        `)
        .not('employees.status', 'in', '("Resigned","Terminated")')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Contract[];
    },
  });
}
```

The `!inner` join with `.not()` filter ensures only contracts for active employees are returned.

#### 1.2 Add Separate Hook for All Contracts (Admin Use)

For admin oversight (e.g., Admin Dashboard Contracts section), create:

```typescript
export function useAllContracts() {
  return useQuery({
    queryKey: ['all-contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          employees (full_name, photo_url, status)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Contract[];
    },
  });
}
```

#### 1.3 Update `usePayroll` Hook

**File: `src/hooks/usePayroll.ts`**

Add employee status filter:

```typescript
export function usePayroll() {
  return useQuery({
    queryKey: ['payroll'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll')
        .select(`
          *,
          employees!inner (
            full_name, hrms_no, bank_name, iban, bank_account_no, 
            department, job_position, photo_url, work_email, 
            joining_date, birthday, status
          ),
          payroll_earnings (id, earning_type, description, amount),
          payroll_deductions (id, deduction_type, reason, amount, days)
        `)
        .not('employees.status', 'in', '("Resigned","Terminated")')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Payroll[];
    },
  });
}
```

#### 1.4 Update Document Renewal Queue Hook

**File: `src/hooks/useDocumentRenewalQueue.ts`**

The hook already has employee status checks, but contracts query needs updating:

```typescript
// Line 55-65: Update contracts query
const { data: contracts, error: contractsError } = await supabase
  .from('contracts')
  .select(`
    id, employee_id, end_date, contract_type,
    employees!inner(full_name, photo_url, department, status)
  `)
  .eq('status', 'Active')
  .eq('employees.status', 'Active')  // ADD THIS FILTER
  .not('end_date', 'is', null);
```

#### 1.5 Auto-Archive Contracts on Employee Deactivation

**Already Implemented** per memory: When an employee is deactivated, contracts are automatically marked as `Terminated`. However, Marlo's contract is still `Active` - this needs a one-time fix and verification of the trigger.

**Fix Action**: Run data correction to set Marlo's contract to `Terminated`:

```sql
UPDATE contracts 
SET status = 'Terminated' 
WHERE employee_id = '58c54ddd-7ace-4dec-9aa4-bd8d87f7307e';
```

---

## Part 2: Employee Portal Education Tab with Bulk Upload

### 2.1 Add Education Tab to Employee Self-Service Portal

**File: `src/pages/EmployeeSelfServicePortal.tsx`**

Add new tab and import required hooks:

```typescript
// Add to imports
import { useEmployeeEducation, useAddEducation, useDeleteEducation } from '@/hooks/useEducation';
import { GraduationCap, Upload, FileUp } from 'lucide-react';

// Add to tabs array (line 314-323)
const tabs = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'leave', label: 'Leave', icon: CalendarDays },
  { id: 'contract', label: 'Contract', icon: FileText },
  { id: 'documents', label: 'Documents', icon: FileCheck },
  { id: 'education', label: 'Education', icon: GraduationCap },  // NEW
  { id: 'performance', label: 'Performance', icon: TrendingUp },
  { id: 'achievements', label: 'Achievements', icon: Award },
  { id: 'security', label: 'Security', icon: Shield },
];
```

### 2.2 Education Tab Content with Bulk Upload

Add new TabsContent section for education:

```typescript
<TabsContent value="education" className="mt-8">
  <div className="grid gap-6">
    {/* Education Records Card */}
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          Education History
        </CardTitle>
        <CardDescription>
          Manage your educational background and upload credentials
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Add Education Form */}
        {/* Similar to EmployeeProfileModal education form */}
        
        {/* Education List */}
        {/* Display existing education records with delete option */}
      </CardContent>
    </Card>
    
    {/* Credentials Upload Card */}
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Credentials
        </CardTitle>
        <CardDescription>
          Upload your school certificates, diplomas, and resume
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Bulk Upload Dropzone */}
        <div className="border-2 border-dashed rounded-xl p-8 text-center">
          <FileUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="font-medium">Drag & drop files or click to browse</p>
          <p className="text-sm text-muted-foreground mt-2">
            Supported: PDF, JPG, PNG (Max 10 files, 10MB each)
          </p>
          <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" />
          <Button className="mt-4">
            <Upload className="w-4 h-4 mr-2" />
            Upload Documents
          </Button>
        </div>
        
        {/* Uploaded Credentials List */}
        {/* Show documents in 'Education' or 'Resume' category */}
      </CardContent>
    </Card>
  </div>
</TabsContent>
```

### 2.3 Create Bulk Upload Hook for Education Documents

**New File: `src/hooks/useEducationDocuments.ts`**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useBulkUploadEducationDocs() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ employeeId, files }: { employeeId: string; files: File[] }) => {
      const uploadedDocs = [];
      
      for (const file of files) {
        const fileName = `${employeeId}/education/${Date.now()}-${file.name}`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('employee-documents')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('employee-documents')
          .getPublicUrl(fileName);
        
        // Create document record
        const { data, error } = await supabase
          .from('employee_documents')
          .insert({
            employee_id: employeeId,
            name: file.name,
            file_url: urlData.publicUrl,
            file_type: file.type,
            file_size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            category: file.name.toLowerCase().includes('resume') ? 'Resume' : 'Education',
          })
          .select()
          .single();
        
        if (error) throw error;
        uploadedDocs.push(data);
      }
      
      return uploadedDocs;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents', variables.employeeId] });
      toast.success(`${data.length} document(s) uploaded successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload: ${error.message}`);
    },
  });
}
```

---

## Part 3: Contract Expiry Notification Fixes

### 3.1 Current Issue

The expiry notification in `EmployeeProfileModal` now correctly reads from `employeeContract?.end_date` (fixed in previous update). However, the **Document Completeness** check includes "Contract" in required categories even when a contract exists.

### 3.2 Update Document Completeness Logic

**File: `src/hooks/useDocumentCompleteness.ts`**

Modify to check if employee has an active contract when determining "Contract" completeness:

```typescript
// Update the hook to accept contracts data
export function useDocumentCompleteness(contracts?: Contract[]) {
  // ... existing code ...
  
  const completenessMap = useMemo(() => {
    const map: Record<string, DocumentCompleteness> = {};
    
    // Group documents by employee
    const docsByEmployee: Record<string, Set<string>> = {};
    
    allDocuments.forEach(doc => {
      if (!docsByEmployee[doc.employee_id]) {
        docsByEmployee[doc.employee_id] = new Set();
      }
      
      const category = doc.category?.trim();
      if (category) {
        const matchedCategory = REQUIRED_CATEGORIES.find(
          req => req.toLowerCase() === category.toLowerCase()
        );
        if (matchedCategory) {
          docsByEmployee[doc.employee_id].add(matchedCategory);
        }
      }
    });
    
    // Check if employee has active contract
    contracts?.forEach(contract => {
      if (contract.status === 'Active') {
        if (!docsByEmployee[contract.employee_id]) {
          docsByEmployee[contract.employee_id] = new Set();
        }
        // Mark "Contract" as complete if active contract exists
        docsByEmployee[contract.employee_id].add('Contract');
      }
    });
    
    // ... rest of calculation
  }, [allDocuments, contracts]);
  
  return { completenessMap, getCompleteness, isLoading, requiredCategories };
}
```

### 3.3 Update Profile Modal to Pass Contracts

**File: `src/components/modals/EmployeeProfileModal.tsx`**

```typescript
// Update hook usage
const { data: contracts = [] } = useContracts();
const { getCompleteness, requiredCategories } = useDocumentCompleteness(contracts);

// Get completeness for current employee
const docCompleteness = currentEmployee ? getCompleteness(currentEmployee.id) : null;
```

### 3.4 Alternative: Simpler Fix

Instead of passing contracts, filter out "Contract" from missing list if employee has an active contract:

```typescript
// In EmployeeProfileModal, when displaying missing documents:
const displayMissingCategories = useMemo(() => {
  if (!docCompleteness?.missingCategories) return [];
  
  // If employee has an active contract, remove "Contract" from missing list
  if (employeeContract && employeeContract.status === 'Active') {
    return docCompleteness.missingCategories.filter(cat => cat !== 'Contract');
  }
  
  return docCompleteness.missingCategories;
}, [docCompleteness, employeeContract]);
```

---

## Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useContracts.ts` | MODIFY | Add employee status filter, create `useAllContracts` |
| `src/hooks/usePayroll.ts` | MODIFY | Add employee status filter |
| `src/hooks/useDocumentRenewalQueue.ts` | MODIFY | Add employee status filter to contracts query |
| `src/pages/EmployeeSelfServicePortal.tsx` | MODIFY | Add Education tab with bulk upload UI |
| `src/hooks/useEducationDocuments.ts` | CREATE | Bulk upload hook for education credentials |
| `src/hooks/useDocumentCompleteness.ts` | MODIFY | Exclude Contract from missing if active contract exists |
| `src/components/modals/EmployeeProfileModal.tsx` | MODIFY | Filter missing categories to exclude Contract when present |

---

## Data Fix Required

Execute this SQL to fix Marlo's contract status:

```sql
UPDATE contracts 
SET status = 'Terminated' 
WHERE employee_id IN (
  SELECT id FROM employees 
  WHERE status IN ('Resigned', 'Terminated')
) 
AND status NOT IN ('Expired', 'Terminated');
```

---

## Summary of Changes

| Requirement | Solution |
|-------------|----------|
| Remove deactivated employees from Payroll | Filter `usePayroll` by employee status |
| Remove deactivated employees from Contracts | Filter `useContracts` by employee status |
| Remove deactivated employees from Renewal | Filter contracts query in renewal hook |
| Remove deactivated employees from Time Clock | Already filtered by `useEmployees` |
| Remove deactivated employees from Attendance | Already filtered by `useEmployees` |
| Allow employee to edit Education | Add Education tab to Employee Portal |
| Bulk upload school credentials/resume | Add bulk upload component in Education tab |
| Fix Contract expiry notification | Already fixed - uses `employeeContract.end_date` |
| Exclude Contract from Missing Docs | Filter out if active contract exists |

---

## Testing Checklist

After implementation:

1. Verify Marlo Abrigo no longer appears in:
   - [ ] Contracts view
   - [ ] Payroll view  
   - [ ] Renewal queue
   - [ ] Time Clock
   - [ ] Employee filters

2. Verify Education tab in Employee Portal:
   - [ ] Add education records
   - [ ] Delete education records
   - [ ] Bulk upload credentials
   - [ ] View uploaded documents

3. Verify Contract expiry:
   - [ ] Shows correct expiry date from active contract
   - [ ] "Contract" removed from missing docs when active contract exists
