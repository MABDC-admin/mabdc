/**
 * UAE Labour Law Gratuity Calculation
 * 
 * Rules:
 * - First 5 years: 21 days per year of basic salary
 * - After 5 years: 30 days per year of basic salary
 * - Minimum 1 year of service required for eligibility
 */

export interface GratuityCalculation {
  yearsOfService: number;
  gratuityAmount: number;
  isEligible: boolean;
}

export function calculateGratuity(joiningDate: string, endDate: string, basicSalary: number): GratuityCalculation {
  const start = new Date(joiningDate);
  const end = new Date(endDate);
  
  // Calculate full years and remaining months precisely
  let fullYears = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  
  // Adjust for day of month
  if (end.getDate() < start.getDate()) {
    months--;
  }
  
  // Normalize months if negative
  if (months < 0) {
    fullYears--;
    months += 12;
  }
  
  const totalYearsDecimal = fullYears + (months / 12);
  const isEligible = totalYearsDecimal >= 1;
  
  let gratuity = 0;
  
  if (isEligible) {
    if (fullYears <= 5) {
      // All service at 21-day rate
      // Step 1: Full years gratuity = (Basic × 21 × Years) / 30
      const fullYearsGratuity = (basicSalary * 21 * fullYears) / 30;
      
      // Step 2: Monthly rate = Full years gratuity / 12
      // For edge case where fullYears is 0 but total >= 1 year (e.g., 1y 0m)
      const monthlyRate = fullYears > 0 
        ? fullYearsGratuity / 12 
        : (basicSalary * 21) / 30 / 12;
      
      // Step 3: Partial months gratuity
      const partialMonthsGratuity = monthlyRate * months;
      
      // Step 4: Total
      gratuity = Math.round(fullYearsGratuity + partialMonthsGratuity);
    } else {
      // More than 5 years - split calculation
      // First 5 years at 21-day rate
      const first5Years = (basicSalary * 21 * 5) / 30;
      
      // Remaining full years at 30-day rate (basicSalary per year)
      const remainingYears = fullYears - 5;
      const remainingYearsGratuity = (basicSalary * 30 * remainingYears) / 30;
      
      // Monthly rate at 30-day rate for partial months
      const monthlyRate = remainingYears > 0 
        ? remainingYearsGratuity / 12 
        : basicSalary / 12;
      
      const partialMonthsGratuity = monthlyRate * months;
      
      gratuity = Math.round(first5Years + remainingYearsGratuity + partialMonthsGratuity);
    }
  }

  return {
    yearsOfService: Math.round(totalYearsDecimal * 100) / 100,
    gratuityAmount: gratuity,
    isEligible,
  };
}
