import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { 
  PlandayApiCredentials, 
  DefinitionCollection, 
  Employee, 
  CostAllocationReportRow 
} from './types';
import { 
  initializeService, 
  fetchEmployees, 
  fetchAllDefinitions, 
  fetchPortalInfo, 
  generateCostAllocationReport, 
  resetService, 
  revokeToken 
} from './services/plandayService';
import { exportCostAllocationReportToExcel } from './services/excelExport';

// --- Icons ---
const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);

const FileSpreadsheetIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const FilterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// --- Header Component ---
const PageHeader: React.FC = () => (
  <div className="text-center">
    <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-3">
      Planday Pay Reports
      <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full align-middle">PAYROLL</span>
    </h1>
    <p className="mt-2 text-lg text-gray-500">Retrieve salary configuration data and generate audit-ready reports</p>
  </div>
);

// --- Token Guide Component ---
const TokenGuide: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const clientId = '13000bf2-dd1f-41ab-a1a0-eeec783f50d7';

  const handleCopy = () => {
    navigator.clipboard.writeText(clientId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 flex flex-col justify-center">
      <h3 className="text-2xl font-bold mb-4 text-gray-900">How to get your refresh token</h3>
      <p className="text-gray-600 mb-6">Follow these steps to generate the necessary credentials from your Planday portal.</p>
      
      <ol className="list-decimal list-inside space-y-4 text-gray-700">
        <li>Log in to your Planday portal</li>
        <li>Go to <strong>Settings &rarr; API Access</strong></li>
        <li>
          Click <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-medium">"Connect APP"</span> and connect to app ID:
          <div className="mt-2 flex items-center justify-between bg-gray-100 p-3 rounded-lg border border-gray-200 font-mono text-sm text-gray-800">
            <span className="break-all">{clientId}</span>
            <button 
              className="text-gray-500 hover:text-blue-600 ml-2 p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center gap-1 flex-shrink-0" 
              onClick={handleCopy} 
              title="Copy ID"
            >
              {copied ? <CheckIcon className="w-5 h-5 text-green-600" /> : <CopyIcon className="w-5 h-5" />}
              <span className="text-xs font-sans font-medium text-gray-600">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </li>
        <li>Authorize the app when prompted</li>
        <li>Copy the <strong>"Token"</strong> value (this is your Refresh Token)</li>
      </ol>
    </div>
  );
};

// --- Auth Form Component ---
const AuthForm: React.FC<{ onSuccess: (c: PlandayApiCredentials) => void; isConnecting?: boolean }> = ({ onSuccess, isConnecting }) => {
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      onSuccess({ 
        clientId: '13000bf2-dd1f-41ab-a1a0-eeec783f50d7', 
        refreshToken: token.trim() 
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <div className="mb-5">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="token">
          Refresh Token
        </label>
        <input
          className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-2.5 px-3.5 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          id="token"
          type="password"
          placeholder="Paste your Planday refresh token here..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
        />
        <p className="text-xs text-gray-500 mt-1.5">Your token is stored safely in your browser session.</p>
      </div>
      <div className="flex items-center justify-between">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2"
          type="submit"
          disabled={!token.trim() || isConnecting}
        >
          {isConnecting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting to Planday...
            </>
          ) : (
            'Connect'
          )}
        </button>
      </div>
    </form>
  );
};

// --- MultiSelectMenu Component ---
interface MultiSelectMenuProps {
  label: string;
  options: { id: number; name: string }[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  toggleOptionLabel?: string;
  toggleOptionEnabled?: boolean;
  onToggleOption?: (enabled: boolean) => void;
  toggleTooltipText?: React.ReactNode;
}

const MultiSelectMenu: React.FC<MultiSelectMenuProps> = ({
  label,
  options,
  selectedIds,
  onChange,
  toggleOptionLabel,
  toggleOptionEnabled,
  onToggleOption,
  toggleTooltipText
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isAllSelected = selectedIds.length === 0 || selectedIds.length === options.length;
  const isNoneSelected = selectedIds.length === 1 && selectedIds[0] === -1;
  const filteredOptions = options.filter(opt => opt.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onChange([]);
    } else {
      onChange([-1]);
    }
  };

  const handleOptionToggle = (optId: number, checked: boolean) => {
    if (isAllSelected) {
      if (!checked) {
        onChange(options.filter(o => o.id !== optId).map(o => o.id));
      }
    } else if (isNoneSelected) {
      if (checked) {
        onChange([optId]);
      }
    } else {
      if (checked) {
        const next = [...selectedIds, optId];
        if (next.length === options.length) {
          onChange([]);
        } else {
          onChange(next);
        }
      } else {
        const next = selectedIds.filter(id => id !== optId);
        if (next.length === 0) {
          onChange([-1]);
        } else {
          onChange(next);
        }
      }
    }
  };

  const getSelectedText = () => {
    if (isNoneSelected) return 'None';
    if (isAllSelected) return 'All';
    if (selectedIds.length === 1) {
      const found = options.find(o => o.id === selectedIds[0]);
      return found ? found.name : '1 selected';
    }
    return `${selectedIds.length} selected`;
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <div className="flex flex-col">
        <label className="text-xs font-semibold text-gray-600 mb-1">{label}</label>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex justify-between items-center w-56 rounded-lg border border-gray-300 shadow-sm px-3.5 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span className="truncate">{getSelectedText()}</span>
          <svg className="-mr-1 ml-2 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="origin-top-left absolute left-0 mt-2 w-72 rounded-xl shadow-2xl bg-white ring-1 ring-black ring-opacity-5 z-50 divide-y divide-gray-100 max-h-96 flex flex-col">
          {/* Optional Toggle Option (e.g. Primary Department) */}
          {toggleOptionLabel && onToggleOption && (
            <div className="p-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-blue-900">
                <input
                  type="checkbox"
                  checked={toggleOptionEnabled}
                  onChange={(e) => onToggleOption(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>{toggleOptionLabel}</span>
              </label>
              {toggleTooltipText && (
                <div className="relative group">
                  <InfoIcon className="w-4 h-4 text-blue-500 cursor-help" />
                  <div className="absolute right-0 bottom-full mb-1.5 w-60 p-2.5 bg-gray-900 text-white text-[11px] leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 pointer-events-none">
                    {toggleTooltipText}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search box */}
          <div className="p-2">
            <input
              type="text"
              placeholder={`Search ${label}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Select All / None */}
          <div className="px-3 py-2 bg-gray-50 flex items-center justify-between text-xs font-medium text-gray-600">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Select All</span>
            </label>
            <button
              type="button"
              onClick={() => onChange([-1])}
              className="text-gray-400 hover:text-gray-700 text-xs"
            >
              Clear
            </button>
          </div>

          {/* Options list */}
          <div className="overflow-y-auto p-2 space-y-1 flex-1">
            {filteredOptions.length === 0 ? (
              <p className="text-xs text-gray-400 p-2 text-center">No options found</p>
            ) : (
              filteredOptions.map((opt) => {
                const checked = isAllSelected || (!isNoneSelected && selectedIds.includes(opt.id));
                return (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-gray-100 cursor-pointer text-xs text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => handleOptionToggle(opt.id, e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="truncate">{opt.name}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Footer Component ---
const AppInfoFooter: React.FC = () => (
  <footer className="py-8 text-center text-gray-400 text-xs mt-auto">
    <div className="flex justify-center items-center gap-1.5 mb-2 group relative">
      <span className="font-medium text-gray-500">App Info & Security</span>
      <InfoIcon className="w-4 h-4 cursor-help text-gray-400 hover:text-gray-600" />
      
      <div className="absolute bottom-full mb-2 w-96 p-5 bg-gray-900 text-white text-left rounded-xl text-xs shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 left-1/2 -translate-x-1/2">
        <p className="leading-relaxed mb-3">
          <strong className="text-white block mb-1">Client-Side Processing & Secure:</strong>
          This web application runs entirely in your browser. Your employee and salary data is never sent to any third-party server; it is fetched directly from the official Planday Open API over HTTPS.
        </p>
        <a 
          href="https://openapi.planday.com/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-300 hover:text-blue-200 underline block mb-3"
        >
          Planday Open API Documentation &rarr;
        </a>
        <div className="pt-2.5 border-t border-gray-700 text-center text-gray-400 text-[11px]">
          Planday Pay Reports &bull; Community Tool
        </div>
      </div>
    </div>
  </footer>
);

// --- Main App Component ---
export default function App() {
  const [currentStep, setCurrentStep] = useState<'auth' | 'configure' | 'results'>('auth');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [portalName, setPortalName] = useState<string | null>(null);

  // Definitions and employee cache
  const [definitions, setDefinitions] = useState<DefinitionCollection | null>(null);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  // Filters
  const [filterDepartment, setFilterDepartment] = useState<number[]>([]);
  const [filterPrimaryDepartment, setFilterPrimaryDepartment] = useState(false);
  const [filterGroup, setFilterGroup] = useState<number[]>([]);
  const [filterType, setFilterType] = useState<number[]>([]);

  // Generation progress
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ completed: 0, total: 0 });
  const abortRef = useRef({ aborted: false });

  // Report results
  const [reportRows, setReportRows] = useState<CostAllocationReportRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Load saved credentials on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('plandayCredentials');
    if (saved) {
      try {
        const creds = JSON.parse(saved);
        handleAuthSuccess(creds);
      } catch (e) {
        console.warn('Error reading saved credentials:', e);
      }
    }
  }, []);

  const handleAuthSuccess = async (creds: PlandayApiCredentials) => {
    setIsLoading(true);
    setLoadingText('Connecting and loading portal info...');
    setError(null);
    try {
      initializeService(creds);
      sessionStorage.setItem('plandayCredentials', JSON.stringify(creds));

      const [defs, info, emps] = await Promise.all([
        fetchAllDefinitions(),
        fetchPortalInfo(),
        fetchEmployees()
      ]);

      setDefinitions(defs);
      if (info && info.name) setPortalName(info.name);
      setAllEmployees(emps);
      setCurrentStep('configure');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to authenticate with Planday. Please verify your token.');
      sessionStorage.removeItem('plandayCredentials');
      resetService();
      setCurrentStep('auth');
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  const handleManualRefresh = async () => {
    setIsLoading(true);
    setLoadingText('Refreshing portal data...');
    try {
      const [defs, info, emps] = await Promise.all([
        fetchAllDefinitions(),
        fetchPortalInfo(),
        fetchEmployees()
      ]);
      setDefinitions(defs);
      if (info && info.name) setPortalName(info.name);
      setAllEmployees(emps);
      setError(null);
    } catch (err: any) {
      setError('Failed to refresh data: ' + err.message);
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  const handleChangeCredentials = async () => {
    setIsLoading(true);
    setLoadingText('Disconnecting from Planday...');
    try {
      await revokeToken();
    } catch (e) {
      console.warn('Error during token revocation:', e);
    } finally {
      sessionStorage.removeItem('plandayCredentials');
      resetService();
      setPortalName(null);
      setDefinitions(null);
      setAllEmployees([]);
      setReportRows([]);
      setCurrentStep('auth');
      setIsLoading(false);
      setLoadingText('');
    }
  };

  // Filter employees according to user selections (same logic as source app)
  const filteredEmployees = useMemo(() => {
    return allEmployees.filter(emp => {
      if (filterPrimaryDepartment) {
        const primDept = emp.primaryDepartmentId;
        if (!primDept) return false;
        if (filterDepartment.length > 0 && !filterDepartment.includes(primDept)) return false;
      } else {
        const deps = emp.departments || emp.departmentIds || [];
        if (filterDepartment.length > 0 && !filterDepartment.some(d => deps.includes(d))) return false;
      }

      const groups = emp.employeeGroups || emp.employeeGroupIds || [];
      if (filterGroup.length > 0 && !filterGroup.some(g => groups.includes(g))) return false;

      if (filterType.length > 0 && !filterType.includes(emp.employeeTypeId || -1)) return false;

      return true;
    });
  }, [allEmployees, filterDepartment, filterPrimaryDepartment, filterGroup, filterType]);

  // Generate Report action
  const handleGenerateReport = async () => {
    if (filteredEmployees.length === 0) {
      setError('No employees match the selected filters. Please adjust your filters.');
      return;
    }

    setError(null);
    setIsGenerating(true);
    abortRef.current = { aborted: false };
    setGenerationProgress({ completed: 0, total: filteredEmployees.length });

    try {
      const rows = await generateCostAllocationReport(
        filteredEmployees,
        definitions,
        (completed, total) => {
          setGenerationProgress({ completed, total });
        },
        abortRef.current
      );

      setReportRows(rows);
      setCurrentStep('results');
    } catch (err: any) {
      if (abortRef.current.aborted) {
        setError('Report generation cancelled.');
      } else {
        setError(err.message || 'Failed to generate report.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancelGeneration = () => {
    abortRef.current.aborted = true;
    setIsGenerating(false);
  };

  // Download Excel Report
  const handleDownloadExcel = () => {
    exportCostAllocationReportToExcel(reportRows, portalName);
  };

  // Summary statistics for report results
  const summaryStats = useMemo(() => {
    const total = reportRows.length;
    let monthlySalary = 0;
    let scheduledHours = 0;
    let businessDays = 0;
    let noAllocation = 0;
    let notSet = 0;

    for (const r of reportRows) {
      if (r.costAllocationType === 'MonthlySalary') monthlySalary++;
      else if (r.costAllocationType === 'ScheduledHours') scheduledHours++;
      else if (r.costAllocationType === 'BusinessDays') businessDays++;
      else if (r.costAllocationType === 'NoAllocation') noAllocation++;
      else if (r.costAllocationType === 'NotSet') notSet++;
    }

    return { total, monthlySalary, scheduledHours, businessDays, noAllocation, notSet };
  }, [reportRows]);

  // Filtered rows for the preview table
  const displayedRows = useMemo(() => {
    return reportRows.filter(r => {
      // Category filter
      if (selectedCategoryFilter !== 'all' && r.costAllocationType !== selectedCategoryFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = r.fullName.toLowerCase().includes(q);
        const matchId = String(r.employeeId).includes(q);
        const matchPayrollId = r.salaryIdentifier.toLowerCase().includes(q);
        const matchType = r.employeeType.toLowerCase().includes(q);
        const matchRule = r.contractRule.toLowerCase().includes(q);
        const matchAlloc = r.costAllocation.toLowerCase().includes(q);
        return matchName || matchId || matchPayrollId || matchType || matchRule || matchAlloc;
      }

      return true;
    });
  }, [reportRows, selectedCategoryFilter, searchTerm]);

  return (
    <div className="min-h-screen font-sans flex flex-col bg-gray-50 text-gray-800">
      <div className="container mx-auto px-4 py-8 flex-grow flex flex-col">
        <PageHeader />

        {/* Logged in Header Banner */}
        {currentStep !== 'auth' && (
          <div className="my-8 max-w-6xl mx-auto w-full">
            <div className="flex flex-wrap justify-between items-center bg-white border border-gray-200 px-6 py-3.5 rounded-xl shadow-sm gap-4">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-gray-700 text-sm">
                  Connected to portal: <strong className="text-gray-900">{portalName || 'Loading...'}</strong>
                </span>
                <button
                  onClick={handleManualRefresh}
                  className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-gray-100"
                  title="Refresh portal definitions & employees"
                  disabled={isLoading || isGenerating}
                >
                  <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-500">
                  {allEmployees.length} total active employees
                </span>
                <span className="text-gray-300">|</span>
                <button
                  onClick={handleChangeCredentials}
                  className="text-gray-600 hover:text-red-700 underline font-medium transition-colors"
                  disabled={isLoading || isGenerating}
                >
                  Disconnect (Log out)
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="max-w-6xl mx-auto w-full flex-grow">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-lg shadow-sm flex items-start justify-between">
              <div>
                <p className="font-semibold text-sm">Error</p>
                <p className="text-sm mt-0.5">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)} 
                className="text-red-400 hover:text-red-600 text-sm ml-4"
              >
                &times;
              </button>
            </div>
          )}

          {/* STEP 1: AUTH */}
          {currentStep === 'auth' && (
            <div className="grid md:grid-cols-2 gap-8 items-start my-8">
              <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <h2 className="text-2xl font-bold mb-3 text-gray-900">Connect to Planday</h2>
                <p className="text-gray-500 mb-6 text-sm">
                  Enter your Planday refresh token to retrieve employee salary cost allocations and generate reports.
                </p>
                <AuthForm onSuccess={handleAuthSuccess} isConnecting={isLoading} />
              </div>
              <TokenGuide />
            </div>
          )}

          {/* STEP 2: CONFIGURE REPORT & FILTERS */}
          {currentStep === 'configure' && (
            <div className="space-y-6">
              {/* Selected Report Card */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-inner">
                      <FileSpreadsheetIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-gray-900">Salary Cost Allocation Report</h2>
                        <span className="bg-green-100 text-green-800 text-[11px] font-semibold px-2 py-0.5 rounded-full">Active</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Retrieves cost allocation settings for employees (Monthly Salary, Scheduled Hours, Business Days, Don't Show, or Not Set) and generates a clean Excel spreadsheet.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">Columns in Excel:</span>
                  <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200 font-mono text-gray-700">Planday Employee API ID</span>
                  <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200 font-mono text-gray-700">Salary Identifier (Payroll ID)</span>
                  <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200 font-mono text-gray-700">Full name</span>
                  <span className="bg-blue-50 px-2 py-1 rounded border border-blue-200 font-mono text-blue-700 font-medium">Employee Type</span>
                  <span className="bg-blue-50 px-2 py-1 rounded border border-blue-200 font-mono text-blue-700 font-medium">Contract Rule</span>
                  <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200 font-mono text-gray-700">Cost Allocation</span>
                </div>
              </div>

              {/* Filters Section */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  <FilterIcon className="w-5 h-5 text-gray-500" />
                  <h3 className="font-bold text-gray-900 text-base">Filter Employees</h3>
                  <span className="text-xs text-gray-400 font-normal ml-auto">Optional: by default includes all active employees</span>
                </div>

                {definitions ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MultiSelectMenu
                      label="Departments"
                      options={definitions.departments}
                      selectedIds={filterDepartment}
                      onChange={setFilterDepartment}
                      toggleOptionEnabled={filterPrimaryDepartment}
                      onToggleOption={setFilterPrimaryDepartment}
                      toggleOptionLabel="Filter by Primary Department only"
                      toggleTooltipText={
                        <>
                          When enabled, matches employees whose <strong>Primary Department</strong> is selected.<br />
                          Note: Employees without a designated primary department will be excluded.
                        </>
                      }
                    />
                    <MultiSelectMenu
                      label="Employee Groups"
                      options={definitions.employeeGroups}
                      selectedIds={filterGroup}
                      onChange={setFilterGroup}
                    />
                    <MultiSelectMenu
                      label="Employee Types"
                      options={definitions.employeeTypes}
                      selectedIds={filterType}
                      onChange={setFilterType}
                    />
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic py-4">Loading filter definitions...</div>
                )}

                {/* Filter preview bar */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    Target employees:{' '}
                    <strong className="text-blue-600 font-bold text-base">{filteredEmployees.length}</strong>
                    <span className="text-gray-400 ml-1">of {allEmployees.length} total</span>
                  </div>

                  {(filterDepartment.length > 0 || filterPrimaryDepartment || filterGroup.length > 0 || filterType.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterDepartment([]);
                        setFilterPrimaryDepartment(false);
                        setFilterGroup([]);
                        setFilterType([]);
                      }}
                      className="text-xs text-gray-500 hover:text-blue-600 underline"
                    >
                      Reset all filters
                    </button>
                  )}
                </div>
              </div>

              {/* Generation Trigger & Progress */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                {!isGenerating ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-gray-900">Ready to Generate</h4>
                      <p className="text-sm text-gray-500">
                        The app will fetch the current cost allocation and contract rule for the {filteredEmployees.length} selected employee{filteredEmployees.length === 1 ? '' : 's'}.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateReport}
                      disabled={filteredEmployees.length === 0}
                      className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FileSpreadsheetIcon className="w-5 h-5" />
                      Generate Salary Cost Allocation Report
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="font-bold text-gray-900 text-sm">
                          Fetching Report Data... ({generationProgress.completed} of {generationProgress.total})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelGeneration}
                        className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 rounded-lg border border-gray-300 hover:border-red-300 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-200"
                        style={{
                          width: `${generationProgress.total > 0 ? (generationProgress.completed / generationProgress.total) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Processing in safe concurrent batches with automatic rate-limit throttling.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: RESULTS & EXPORT */}
          {currentStep === 'results' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                  <span className="text-xs font-semibold text-gray-500 block uppercase tracking-wider">Total</span>
                  <span className="text-2xl font-bold text-gray-900 mt-1 block">{summaryStats.total}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30 shadow-sm text-center">
                  <span className="text-xs font-semibold text-blue-700 block uppercase tracking-wider">Business Days</span>
                  <span className="text-2xl font-bold text-blue-700 mt-1 block">{summaryStats.businessDays}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm text-center">
                  <span className="text-xs font-semibold text-emerald-700 block uppercase tracking-wider">Salary Amount</span>
                  <span className="text-2xl font-bold text-emerald-700 mt-1 block">{summaryStats.monthlySalary}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 shadow-sm text-center">
                  <span className="text-xs font-semibold text-indigo-700 block uppercase tracking-wider">Sched. Hours</span>
                  <span className="text-2xl font-bold text-indigo-700 mt-1 block">{summaryStats.scheduledHours}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm text-center">
                  <span className="text-xs font-semibold text-amber-700 block uppercase tracking-wider">Don't Show</span>
                  <span className="text-2xl font-bold text-amber-700 mt-1 block">{summaryStats.noAllocation}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                  <span className="text-xs font-semibold text-gray-500 block uppercase tracking-wider">Not Set</span>
                  <span className="text-2xl font-bold text-gray-600 mt-1 block">{summaryStats.notSet}</span>
                </div>
              </div>

              {/* Action Bar */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('configure')}
                    className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-colors flex items-center gap-1.5"
                  >
                    &larr; Back to Filters
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateReport}
                    className="px-4 py-2.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <RefreshIcon className="w-4 h-4" /> Re-run Report
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center gap-2 text-sm"
                >
                  <DownloadIcon className="w-5 h-5" />
                  Download Excel Report (.xlsx)
                </button>
              </div>

              {/* Table Filter & Search Controls */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-[260px]">
                  <input
                    type="text"
                    placeholder="Search by name, ID, payroll ID, employee type, contract rule, or allocation..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-sm px-3.5 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-600">Allocation Type:</label>
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All ({reportRows.length})</option>
                    <option value="BusinessDays">Business days ({summaryStats.businessDays})</option>
                    <option value="MonthlySalary">Shifts - Salary Amount ({summaryStats.monthlySalary})</option>
                    <option value="ScheduledHours">Shifts - Scheduled Hours ({summaryStats.scheduledHours})</option>
                    <option value="NoAllocation">Salary set as Don't show ({summaryStats.noAllocation})</option>
                    <option value="NotSet">Salary not set ({summaryStats.notSet})</option>
                  </select>
                </div>
              </div>

              {/* Preview Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                  <h3 className="font-bold text-gray-900 text-sm">
                    Report Preview ({displayedRows.length} of {reportRows.length} rows)
                  </h3>
                  <span className="text-xs text-gray-500">
                    Matches exact 6 columns generated in the Excel file
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">
                          Planday Employee API ID
                        </th>
                        <th scope="col" className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">
                          Salary Identifier (Payroll ID)
                        </th>
                        <th scope="col" className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">
                          Full name
                        </th>
                        <th scope="col" className="px-4 py-3 text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-50/50">
                          Employee Type
                        </th>
                        <th scope="col" className="px-4 py-3 text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-50/50">
                          Contract Rule
                        </th>
                        <th scope="col" className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">
                          Cost Allocation
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {displayedRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-400 text-sm">
                            No matching employee records found.
                          </td>
                        </tr>
                      ) : (
                        displayedRows.map((row) => {
                          let badgeBg = 'bg-gray-100 text-gray-700 border-gray-200';
                          if (row.costAllocationType === 'BusinessDays') {
                            badgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
                          } else if (row.costAllocationType === 'MonthlySalary') {
                            badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                          } else if (row.costAllocationType === 'ScheduledHours') {
                            badgeBg = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                          } else if (row.costAllocationType === 'NoAllocation') {
                            badgeBg = 'bg-amber-50 text-amber-800 border-amber-200';
                          }

                          return (
                            <tr key={row.employeeId} className="hover:bg-gray-50/80 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-900 font-semibold">
                                {row.employeeId}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-700">
                                {row.salaryIdentifier ? (
                                  <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200 font-medium">
                                    {row.salaryIdentifier}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                                {row.fullName}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-800">
                                {row.employeeType ? (
                                  <span className="bg-gray-50 px-2 py-1 rounded border border-gray-200 font-medium">
                                    {row.employeeType}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-800">
                                {row.contractRule ? (
                                  <span className="bg-gray-50 px-2 py-1 rounded border border-gray-200 font-medium">
                                    {row.contractRule}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs">
                                <span className={`inline-block px-2.5 py-1 rounded-md border font-medium ${badgeBg}`}>
                                  {row.costAllocation}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>

        <AppInfoFooter />
      </div>
    </div>
  );
}