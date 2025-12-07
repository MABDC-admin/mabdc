import { useState } from 'react';
import { useEmployees } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, RefreshCw, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function EOSView() {
  const { data: employees = [], isLoading, refetch } = useEmployees();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [calculatedEOS, setCalculatedEOS] = useState<{
    employeeName: string;
    yearsOfService: number;
    basicSalary: number;
    gratuity: number;
  } | null>(null);

  const calculateGratuity = () => {
    const employee = employees.find(e => e.id === selectedEmployeeId);
    if (!employee) return;

    const start = new Date(employee.joining_date);
    const now = new Date();
    const years = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const basicSalary = employee.basic_salary || 0;
    
    let gratuity = 0;
    if (years >= 1) {
      if (years <= 5) {
        gratuity = Math.round((21 / 30) * basicSalary * years);
      } else {
        const first5 = (21 / 30) * basicSalary * 5;
        const remaining = (30 / 30) * basicSalary * (years - 5);
        gratuity = Math.round(first5 + remaining);
      }
    }

    setCalculatedEOS({
      employeeName: employee.full_name,
      yearsOfService: Math.round(years * 10) / 10,
      basicSalary,
      gratuity,
    });
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Calculator Section */}
      <section className="glass-card rounded-3xl border border-border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">End of Service Calculator</h1>
            <p className="text-xs text-muted-foreground mt-1">Gratuity calculations per UAE Labour Law</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-border">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        <div className="glass-card rounded-2xl border border-border p-4 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">UAE Gratuity Calculation Rules</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• First 5 years: 21 days per year of basic salary</li>
            <li>• After 5 years: 30 days per year of basic salary</li>
            <li>• Minimum 1 year of service required for eligibility</li>
            <li>• Maximum gratuity capped at 2 years of basic salary</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Select Employee</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue placeholder="Choose an employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.hrms_no})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEmployeeId && (() => {
              const employee = employees.find(e => e.id === selectedEmployeeId);
              if (!employee) return null;
              const start = new Date(employee.joining_date);
              const now = new Date();
              const years = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);

              return (
                <div className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Joining Date</span>
                    <span className="text-xs text-foreground">{new Date(employee.joining_date).toLocaleDateString('en-GB')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Years of Service</span>
                    <span className="text-xs text-foreground">{Math.round(years * 10) / 10} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Basic Salary</span>
                    <span className="text-xs text-foreground">AED {(employee.basic_salary || 0).toLocaleString()}</span>
                  </div>
                </div>
              );
            })()}

            <Button 
              onClick={calculateGratuity}
              disabled={!selectedEmployeeId}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Calculate Gratuity
            </Button>
          </div>

          {/* Result */}
          <div className="flex items-center justify-center">
            {calculatedEOS ? (
              <div className="text-center p-6 rounded-2xl bg-primary/10 border border-primary/30 w-full animate-fade-in">
                <DollarSign className="w-12 h-12 mx-auto text-primary mb-3" />
                <p className="text-xs text-muted-foreground mb-1">{calculatedEOS.employeeName}</p>
                <p className="text-xs text-muted-foreground mb-2">{calculatedEOS.yearsOfService} years of service</p>
                <p className="text-4xl font-bold text-primary">
                  AED {calculatedEOS.gratuity.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Estimated End of Service Gratuity</p>
              </div>
            ) : (
              <div className="text-center p-6 text-muted-foreground">
                <Calculator className="w-12 h-12 mx-auto opacity-30 mb-3" />
                <p className="text-sm">Select an employee and calculate</p>
                <p className="text-xs mt-1">to see the gratuity amount</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
