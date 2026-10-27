import { 
  PlandayApiCredentials, 
  Employee, 
  DefinitionCollection, 
  CostAllocationReportRow,
  CostAllocationResponse
} from '../types';

const AUTH_URL = 'https://id.planday.com/connect/token';
const REVOCATION_URL = 'https://id.planday.com/connect/revocation';
const API_BASE_URL = 'https://openapi.planday.com';

let credentials_internal: PlandayApiCredentials | null = null;
let accessToken: string | null = null;
let tokenExpiry: number | null = null;
let globalDelayUntil = 0;

export function initializeService(credentials: PlandayApiCredentials) {
  if (credentials_internal?.clientId !== credentials.clientId || credentials_internal?.refreshToken !== credentials.refreshToken) {
    accessToken = null;
    tokenExpiry = null;
  }
  credentials_internal = { ...credentials };
}

export function resetService() {
  credentials_internal = null;
  accessToken = null;
  tokenExpiry = null;
}

export async function revokeToken(): Promise<void> {
  let creds = credentials_internal;
  if (!creds) {
    try {
      const saved = sessionStorage.getItem('plandayCredentials');
      if (saved) creds = JSON.parse(saved);
    } catch {}
  }
  if (!creds || !creds.clientId || !creds.refreshToken) {
    resetService();
    return;
  }

  try {
    const payload = new URLSearchParams({
      client_id: creds.clientId,
      token: creds.refreshToken,
    });

    await fetch(REVOCATION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString(),
    });
  } catch (err) {
    console.warn('Failed to revoke Planday token on server:', err);
  } finally {
    resetService();
  }
}

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAccessToken(): Promise<string> {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  if (!credentials_internal) {
    throw new Error("Planday service not initialized with credentials.");
  }

  const payload = new URLSearchParams({
    client_id: credentials_internal.clientId,
    grant_type: 'refresh_token',
    refresh_token: credentials_internal.refreshToken,
  });

  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    sessionStorage.removeItem('plandayCredentials');
    credentials_internal = null;
    accessToken = null;
    tokenExpiry = null;
    throw new Error(`Failed to refresh access token: ${response.status} ${errorText}. Your credentials may be invalid or expired. Please re-enter them.`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

  if (data.refresh_token && data.refresh_token !== credentials_internal.refreshToken) {
    credentials_internal.refreshToken = data.refresh_token;
    sessionStorage.setItem('plandayCredentials', JSON.stringify(credentials_internal));
  }

  return accessToken;
}

// Optimized retry logic with NetworkError handling and exponential backoff
export async function fetchWithAuth(url: string, options: RequestInit = { method: 'GET' }, retries = 5, backoffDelay = 2000): Promise<Response> {
  if (!credentials_internal) throw new Error("Service not initialized");

  const now = Date.now();
  if (globalDelayUntil > now) {
    await wait(globalDelayUntil - now);
  }

  const token = await getAccessToken();
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'X-ClientId': credentials_internal.clientId,
  };

  try {
    const response = await fetch(url, { ...options, headers });

    // Handle Rate Limiting (429)
    if (response.status === 429) {
      if (retries > 0) {
        const retryAfterHeader = response.headers.get('Retry-After');
        const xRateLimitReset = response.headers.get('x-ratelimit-reset');

        let waitTime = 1000;

        if (retryAfterHeader) {
          waitTime = parseInt(retryAfterHeader, 10) * 1000;
        } else if (xRateLimitReset) {
          waitTime = (parseInt(xRateLimitReset, 10) + 1) * 1000;
        }

        globalDelayUntil = Math.max(globalDelayUntil, Date.now() + waitTime);
        console.warn(`Rate limited (429). Retrying in ${waitTime}ms...`);
        await wait(waitTime);
        return fetchWithAuth(url, options, retries - 1, backoffDelay);
      }
    }

    // Proactive Rate Limiting checks
    if (response.ok) {
      const remaining = response.headers.get('x-ratelimit-remaining');
      const reset = response.headers.get('x-ratelimit-reset');
      if (remaining !== null && reset !== null) {
        if (parseInt(remaining, 10) === 0) {
          const waitTime = (parseInt(reset, 10) + 1) * 1000;
          globalDelayUntil = Math.max(globalDelayUntil, Date.now() + waitTime);
        }
      }
    }

    // Handle Server Errors (5xx)
    if (response.status >= 500 && retries > 0) {
      console.warn(`Server error ${response.status}. Retrying...`);
      await wait(1000);
      return fetchWithAuth(url, options, retries - 1, backoffDelay);
    }

    return response;
  } catch (error: any) {
    const isNetworkError = error.name === 'TypeError' || error.message?.includes('NetworkError') || error.message?.includes('fetch');

    if (isNetworkError && retries > 0) {
      console.warn(`Network error detected: ${error.message}. Pausing for ${backoffDelay}ms and retrying...`);
      await wait(backoffDelay);
      return fetchWithAuth(url, options, retries - 1, backoffDelay * 1.5);
    }
    throw error;
  }
}

export async function fetchPaginatedData(endpoint: string): Promise<any[]> {
  let allData: any[] = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const url = `${API_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}limit=${limit}&offset=${offset}`;
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error(`Failed to fetch ${endpoint}: ${await response.text()}`);
    const result = await response.json();

    let items = [];
    if (Array.isArray(result)) {
      items = result;
      allData = allData.concat(items);
      break;
    } else if (result && result.data && Array.isArray(result.data)) {
      items = result.data;
      allData = allData.concat(items);
      if (items.length < limit || (result.paging && result.paging.total <= allData.length)) {
        break;
      }
      offset += items.length;
    } else {
      break;
    }
  }
  return allData;
}

export async function fetchEmployees(): Promise<Employee[]> {
  return fetchPaginatedData('/hr/v1.0/employees?special=BankAccount,BirthDate,Ssn');
}

export async function fetchPortalInfo(): Promise<any> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/portal/v1.0/info`);
    if (!response.ok) return null;
    const json = await response.json();
    return json.data || json;
  } catch (e) {
    console.warn("Could not fetch portal info:", e);
    return null;
  }
}

export async function fetchAllDefinitions(): Promise<DefinitionCollection> {
  const [departments, employeeGroups, employeeTypes, contractRules] = await Promise.all([
    fetchPaginatedData('/hr/v1.0/departments').catch(() => []),
    fetchPaginatedData('/hr/v1.0/employeegroups').catch(() => []),
    fetchPaginatedData('/hr/v1.0/employeetypes').catch(() => []),
    fetchPaginatedData('/contractrules/v1/contractrules').catch(() => []),
  ]);

  return { departments, employeeGroups, employeeTypes, contractRules };
}

/**
 * Endpoint:
 * GET https://openapi.planday.com/pay/v1.0/salaries/scheduling/timeandcost/allocations/{employeeId}
 */
export async function fetchEmployeeCostAllocation(employeeId: number): Promise<CostAllocationResponse | null> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/pay/v1.0/salaries/scheduling/timeandcost/allocations/${employeeId}`);
    
    // Status 204 No Content, 404 Not Found, or empty body -> Salary not set
    if (response.status === 204 || response.status === 404) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const text = await response.text();
    if (!text || !text.trim()) {
      return null;
    }

    const json = JSON.parse(text);
    return json.data !== undefined ? json.data : json;
  } catch (err) {
    console.warn(`Error fetching cost allocation for employee ${employeeId}:`, err);
    return null;
  }
}

/**
 * Endpoint:
 * GET https://openapi.planday.com/contractrules/v1/employees/{employeeId}
 */
export async function fetchEmployeeContractRule(employeeId: number): Promise<any | null> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/contractrules/v1/employees/${employeeId}`);
    if (response.status === 204 || response.status === 404) {
      return null;
    }
    if (!response.ok) {
      return null;
    }
    const text = await response.text();
    if (!text || !text.trim()) {
      return null;
    }
    const json = JSON.parse(text);
    return json.data !== undefined ? json.data : json;
  } catch (err) {
    console.warn(`Error fetching contract rule for employee ${employeeId}:`, err);
    return null;
  }
}

/**
 * Format the Cost Allocation API response per user specifications:
 * - Empty body or null -> "Salary not set"
 * - NoAllocation -> "Salary set as Don't show"
 * - MonthlySalary -> "Shifts - Salary Amount"
 * - ScheduledHours -> "Shifts - Scheduled Hours"
 * - BusinessDays -> "Business days: Monday, .. ; Department: XXX"
 */
export function formatCostAllocation(data: CostAllocationResponse | null | undefined): {
  displayText: string;
  category: 'MonthlySalary' | 'ScheduledHours' | 'BusinessDays' | 'NoAllocation' | 'NotSet' | 'Other';
} {
  if (!data || typeof data !== 'object') {
    return { displayText: "Salary not set", category: "NotSet" };
  }

  const rawAllocation = data.costAllocation;

  if (!rawAllocation || rawAllocation === "SalaryNotSet") {
    return { displayText: "Salary not set", category: "NotSet" };
  }

  if (rawAllocation === "NoAllocation" || rawAllocation === "None" || rawAllocation === "DontShow") {
    return { displayText: "Salary set as Don't show", category: "NoAllocation" };
  }

  if (rawAllocation === "MonthlySalary") {
    return { displayText: "Shifts - Salary Amount", category: "MonthlySalary" };
  }

  if (rawAllocation === "ScheduledHours") {
    return { displayText: "Shifts - Scheduled Hours", category: "ScheduledHours" };
  }

  if (rawAllocation === "BusinessDays") {
    const distributions = data.departmentDistributions;
    if (!distributions || !Array.isArray(distributions) || distributions.length === 0) {
      return { displayText: "Business days: None; Department: None", category: "BusinessDays" };
    }

    const DAY_ORDER: Array<{ key: string; label: string }> = [
      { key: 'monday', label: 'Monday' },
      { key: 'tuesday', label: 'Tuesday' },
      { key: 'wednesday', label: 'Wednesday' },
      { key: 'thursday', label: 'Thursday' },
      { key: 'friday', label: 'Friday' },
      { key: 'saturday', label: 'Saturday' },
      { key: 'sunday', label: 'Sunday' }
    ];

    const distStrings = distributions.map(dist => {
      const deptName = dist.department?.name || (dist.department?.id ? `Dept #${dist.department.id}` : 'None');
      const weights = dist.weekDaysWeight || {};
      const activeDays: string[] = [];

      for (const d of DAY_ORDER) {
        if (Number(weights[d.key]) > 0) {
          activeDays.push(d.label);
        }
      }

      const daysText = activeDays.length > 0 ? activeDays.join(', ') : 'None';
      return `Business days: ${daysText}; Department: ${deptName}`;
    });

    return { 
      displayText: distStrings.join(' | '), 
      category: "BusinessDays" 
    };
  }

  return { displayText: String(rawAllocation), category: "Other" };
}

/**
 * Resolve employee type display name
 */
export function resolveEmployeeTypeName(
  emp: Employee, 
  employeeTypeMap: Map<number, string>
): string {
  if (emp.employeeTypeId !== undefined && emp.employeeTypeId !== null) {
    const mapped = employeeTypeMap.get(Number(emp.employeeTypeId));
    if (mapped) return mapped;
  }

  const direct = (emp as any).employeeType;
  if (direct) {
    if (typeof direct === 'string') return direct;
    if (typeof direct === 'object' && direct.name) return direct.name;
  }

  const directName = (emp as any).employeeTypeName;
  if (directName && typeof directName === 'string') return directName;

  if (emp.employeeTypeId) return `Type #${emp.employeeTypeId}`;

  return '';
}

/**
 * Resolve contract rule display name
 */
export function resolveContractRuleName(
  contractRuleData: any, 
  emp: Employee, 
  contractRuleMap: Map<number, string>
): string {
  if (contractRuleData) {
    if (typeof contractRuleData === 'string') return contractRuleData;
    
    // Check direct name
    const directName = contractRuleData.name || contractRuleData.ruleName || contractRuleData.contractRuleName || contractRuleData.title;
    if (directName && typeof directName === 'string') return directName;

    // Check ID reference
    const ruleId = contractRuleData.ruleId ?? contractRuleData.contractRuleId ?? contractRuleData.id;
    if (ruleId !== undefined && ruleId !== null) {
      const mapped = contractRuleMap.get(Number(ruleId));
      if (mapped) return mapped;
      if (contractRuleData.rule && contractRuleData.rule.name) return contractRuleData.rule.name;
      return `Rule #${ruleId}`;
    }
  }

  // Fallback to fields on emp record
  const empRuleId = emp.contractRuleId ?? emp.contractRulesRuleId ?? (emp as any).contractRuleId;
  if (empRuleId !== undefined && empRuleId !== null) {
    const mapped = contractRuleMap.get(Number(empRuleId));
    if (mapped) return mapped;
  }

  const empRuleName = emp.contractRuleName || (emp as any).contractRule;
  if (empRuleName && typeof empRuleName === 'string') return empRuleName;

  return '';
}

/**
 * Batch fetch cost allocations and contract rules with concurrency control, progress callback, and abort support.
 */
export async function generateCostAllocationReport(
  employees: Employee[],
  definitions: DefinitionCollection | null,
  onProgress?: (completed: number, total: number) => void,
  abortRef?: { aborted: boolean }
): Promise<CostAllocationReportRow[]> {
  const total = employees.length;
  let completed = 0;
  const results: CostAllocationReportRow[] = new Array(total);

  const deptMap = new Map<number, string>();
  definitions?.departments.forEach(d => deptMap.set(d.id, d.name));

  const groupMap = new Map<number, string>();
  definitions?.employeeGroups.forEach(g => groupMap.set(g.id, g.name));

  const typeMap = new Map<number, string>();
  definitions?.employeeTypes.forEach(t => typeMap.set(t.id, t.name));

  const ruleMap = new Map<number, string>();
  definitions?.contractRules.forEach(r => ruleMap.set(r.id, r.name));

  const CONCURRENCY = 5;
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < total) {
      if (abortRef?.aborted) return;
      const index = currentIndex++;
      const emp = employees[index];

      let rawAlloc: CostAllocationResponse | null = null;
      let rawContractRule: any = null;

      try {
        // Fetch cost allocation and contract rule in parallel
        const [allocRes, ruleRes] = await Promise.all([
          fetchEmployeeCostAllocation(emp.id),
          fetchEmployeeContractRule(emp.id)
        ]);
        rawAlloc = allocRes;
        rawContractRule = ruleRes;
      } catch (err) {
        console.warn(`Error on employee ${emp.id}:`, err);
      }

      const { displayText, category } = formatCostAllocation(rawAlloc);
      const employeeType = resolveEmployeeTypeName(emp, typeMap);
      const contractRule = resolveContractRuleName(rawContractRule, emp, ruleMap);

      const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || `Employee #${emp.id}`;
      const salaryIdentifier = emp.salaryIdentifier || '';

      const empDepts = (emp as any).departments || emp.departmentIds || [];
      const departmentNames = empDepts.map((id: number) => deptMap.get(id)).filter(Boolean) as string[];

      const empGroups = (emp as any).employeeGroups || emp.employeeGroupIds || [];
      const employeeGroupNames = empGroups.map((id: number) => groupMap.get(id)).filter(Boolean) as string[];

      results[index] = {
        employeeId: emp.id,
        salaryIdentifier,
        fullName,
        employeeType,
        contractRule,
        costAllocation: displayText,
        costAllocationType: category,
        rawAllocation: rawAlloc,
        rawContractRule,
        departmentNames,
        employeeGroupNames
      };

      completed++;
      if (onProgress) {
        onProgress(completed, total);
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker());
  await Promise.all(workers);

  if (abortRef?.aborted) {
    throw new Error('Report generation was cancelled.');
  }

  return results.filter(Boolean);
}