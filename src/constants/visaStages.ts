export interface VisaStage {
  id: string;
  name: string;
  shortName: string;
  description: string;
  color: string;
  order: number;
  conditional?: boolean;
  hasCost?: boolean;
  costField?: string;
  canBeSkipped?: boolean;
  requiredField?: string;
}

export const VISA_STAGES: VisaStage[] = [
  {
    id: 'mohre_application',
    name: 'MOHRE Application',
    shortName: 'MOHRE',
    description: 'Ministry of Human Resources & Emiratisation application',
    color: 'blue',
    order: 1,
    hasCost: true,
    costField: 'mohre_cost'
  },
  {
    id: 'labour_card_payment',
    name: 'Labour Card Payment',
    shortName: 'Labour Card',
    description: 'Labour card fee payment',
    color: 'purple',
    order: 2,
    hasCost: true,
    costField: 'labour_card_amount'
  },
  {
    id: 'immigration_processing',
    name: 'Immigration Processing',
    shortName: 'Immigration',
    description: 'Immigration approval (up to 2 months)',
    color: 'orange',
    order: 3,
    hasCost: true,
    costField: 'immigration_cost',
    canBeSkipped: true,
    requiredField: 'immigration_required'
  },
  {
    id: 'tawjeeh',
    name: 'Tawjeeh',
    shortName: 'Tawjeeh',
    description: 'Required for non-skilled positions only',
    color: 'yellow',
    order: 4,
    conditional: true,
    hasCost: true,
    costField: 'tawjeeh_cost'
  },
  {
    id: 'medical_examination',
    name: 'Medical Examination',
    shortName: 'Medical',
    description: 'Medical test scheduling and results',
    color: 'red',
    order: 5,
    hasCost: true,
    costField: 'medical_cost',
    canBeSkipped: true,
    requiredField: 'medical_required'
  },
  {
    id: 'daman_insurance',
    name: 'Daman Insurance',
    shortName: 'Daman',
    description: 'Health insurance application',
    color: 'green',
    order: 6,
    hasCost: true,
    costField: 'daman_cost',
    canBeSkipped: true,
    requiredField: 'daman_required'
  },
  {
    id: 'residence_visa',
    name: 'Residence Visa & Emirates ID',
    shortName: 'Visa & EID',
    description: 'Visa stamping and Emirates ID registration',
    color: 'indigo',
    order: 7,
    hasCost: true,
    costField: 'residence_visa_cost'
  },
  {
    id: 'onboarding',
    name: 'Onboarding',
    shortName: 'Onboarding',
    description: 'Final employee onboarding',
    color: 'emerald',
    order: 8
  }
];

export const VISA_TYPES = [
  'Employment',
  'Residence',
  'Visit',
  'Transit'
] as const;

export type VisaType = typeof VISA_TYPES[number];

export const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700' },
  yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700' },
  red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-700' },
  green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-700' },
  indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700' },
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700' }
};

export const getStageById = (stageId: string): VisaStage | undefined => {
  return VISA_STAGES.find(stage => stage.id === stageId);
};

export const getNextStage = (currentStageId: string): VisaStage | undefined => {
  const currentStage = getStageById(currentStageId);
  if (!currentStage) return undefined;
  return VISA_STAGES.find(stage => stage.order === currentStage.order + 1);
};

export const getPreviousStage = (currentStageId: string): VisaStage | undefined => {
  const currentStage = getStageById(currentStageId);
  if (!currentStage) return undefined;
  return VISA_STAGES.find(stage => stage.order === currentStage.order - 1);
};

// Non-skilled positions that require Tawjeeh
export const NON_SKILLED_POSITIONS = [
  'Driver',
  'Cleaner',
  'Security Guard',
  'Laborer',
  'Helper',
  'Domestic Worker',
  'Construction Worker',
  'Warehouse Worker',
  'Delivery Driver',
  'Messenger'
];

export const isNonSkilledPosition = (position: string): boolean => {
  return NON_SKILLED_POSITIONS.some(p => 
    position.toLowerCase().includes(p.toLowerCase())
  );
};

// Calculate total cost from application
export const calculateTotalCost = (application: Record<string, any>): number => {
  return (
    (application.mohre_cost || 0) +
    (application.labour_card_amount || 0) +
    (application.immigration_cost || 0) +
    (application.tawjeeh_cost || 0) +
    (application.medical_cost || 0) +
    (application.daman_cost || 0) +
    (application.residence_visa_cost || 0)
  );
};
