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
  const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
  
  let gratuity = 0;
  const isEligible = years >= 1;
  
  if (isEligible) {
    if (years <= 5) {
      gratuity = Math.round((21 / 30) * basicSalary * years);
    } else {
      const first5 = (21 / 30) * basicSalary * 5;
      const remaining = (30 / 30) * basicSalary * (years - 5);
      gratuity = Math.round(first5 + remaining);
    }
  }

  return {
    yearsOfService: Math.round(years * 10) / 10,
    gratuityAmount: gratuity,
    isEligible,
  };
}
