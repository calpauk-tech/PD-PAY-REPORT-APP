export interface PlandayApiCredentials {
  clientId: string;
  refreshToken: string;
}

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  departmentIds?: number[];
  departments?: number[];
  employeeGroupIds?: number[];
  employeeGroups?: number[];
  salaryIdentifier?: string | null;
  employeeTypeId?: number;
  primaryDepartmentId?: number | null;
}

export interface IdName {
  id: number;
  name: string;
}

export interface Department extends IdName {}
export interface EmployeeGroup extends IdName {}
export interface EmployeeType extends IdName {}

export interface DefinitionCollection {
  departments: Department[];
  employeeGroups: EmployeeGroup[];
  employeeTypes: EmployeeType[];
}

export interface WeekDaysWeight {
  none?: number;
  monday?: number;
  tuesday?: number;
  wednesday?: number;
  thursday?: number;
  friday?: number;
  saturday?: number;
  sunday?: number;
  [key: string]: number | undefined;
}

export interface DepartmentDistribution {
  department?: {
    id: number;
    name: string;
    isMember?: boolean;
  };
  weekDaysWeight?: WeekDaysWeight;
  departmentWeight?: number;
}

export interface CostAllocationResponse {
  employeeId?: number;
  validFrom?: string;
  costAllocation?: 'MonthlySalary' | 'ScheduledHours' | 'BusinessDays' | 'NoAllocation' | string;
  repeatingDayOfMonth?: number;
  repetitionMode?: string;
  departmentDistributions?: DepartmentDistribution[];
  createdByEmployeeId?: number;
  createdAt?: string;
}

export interface CostAllocationReportRow {
  employeeId: number;
  salaryIdentifier: string;
  fullName: string;
  costAllocation: string;
  costAllocationType: 'MonthlySalary' | 'ScheduledHours' | 'BusinessDays' | 'NoAllocation' | 'NotSet' | 'Other';
  rawAllocation?: CostAllocationResponse | null;
  departmentNames?: string[];
  employeeGroupNames?: string[];
}
