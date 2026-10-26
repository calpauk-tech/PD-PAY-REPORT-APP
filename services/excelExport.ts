import * as XLSX from 'xlsx-js-style';
import { CostAllocationReportRow } from '../types';

export function exportCostAllocationReportToExcel(rows: CostAllocationReportRow[], portalName?: string | null) {
  const data = [
    [
      "Planday Employee API ID",
      "Salary Identifier (Payroll ID)",
      "Full name",
      "Cost Allocation"
    ],
    ...rows.map(r => [
      r.employeeId,
      r.salaryIdentifier || "",
      r.fullName,
      r.costAllocation
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Auto-fit column widths
  ws['!cols'] = [
    { wch: 26 }, // Planday Employee API ID
    { wch: 30 }, // Salary Identifier (Payroll ID)
    { wch: 28 }, // Full name
    { wch: 55 }  // Cost Allocation
  ];

  // Header style matching Planday brand blue
  const headerStyle = {
    font: { name: 'Arial', sz: 11, bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "2563EB" } }, // blue-600
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "93C5FD" } },
      bottom: { style: "medium", color: { rgb: "1D4ED8" } },
      left: { style: "thin", color: { rgb: "93C5FD" } },
      right: { style: "thin", color: { rgb: "93C5FD" } }
    }
  };

  const cellStyle = {
    font: { name: 'Arial', sz: 10, color: { rgb: "1F2937" } },
    alignment: { vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "E5E7EB" } },
      bottom: { style: "thin", color: { rgb: "E5E7EB" } },
      left: { style: "thin", color: { rgb: "E5E7EB" } },
      right: { style: "thin", color: { rgb: "E5E7EB" } }
    }
  };

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:D1');
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const headerCell = XLSX.utils.encode_cell({ r: 0, c: C });
    if (ws[headerCell]) {
      ws[headerCell].s = headerStyle;
    }
  }

  for (let R = 1; R <= range.e.r; ++R) {
    const isAlt = R % 2 === 0;
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (ws[cellRef]) {
        const align = C === 0 ? "center" : C === 1 ? "center" : "left";
        ws[cellRef].s = {
          ...cellStyle,
          alignment: { vertical: "center", horizontal: align },
          fill: isAlt ? { fgColor: { rgb: "F9FAFB" } } : undefined
        };
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Salary Cost Allocation");

  const today = new Date().toISOString().split('T')[0];
  const safePortal = portalName ? `_${portalName.replace(/[^a-zA-Z0-9-_]/g, '_')}` : '';
  const filename = `Planday_Salary_Cost_Allocation_Report${safePortal}_${today}.xlsx`;

  XLSX.writeFile(wb, filename);
}
