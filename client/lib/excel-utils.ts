import * as XLSX from 'xlsx';

export interface LeadExportData {
  'Sl.No.': number;
  'Date': string;
  'Customer Name': string;
  'Phone No.': string;
  'Remark 1': string;
  'Remark 2': string;
  'Remark 3': string;
}

export interface LeadImportData {
  'Sl.No.'?: number | string;
  'Date': string;
  'Customer Name': string;
  'Phone No.': string;
  'Remark 1'?: string;
  'Remark 2'?: string;
  'Remark 3'?: string;
}

export const exportLeadsToExcel = (leads: any[]) => {
  const exportData: LeadExportData[] = leads.map((lead, index) => ({
    'Sl.No.': index + 1,
    'Date': lead.date,
    'Customer Name': lead.customerName,
    'Phone No.': lead.phoneNo,
    'Remark 1': lead.remark1 || '',
    'Remark 2': lead.remark2 || '',
    'Remark 3': lead.remark3 || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

  // Set column widths
  worksheet['!cols'] = [
    { wch: 8 },   // Sl.No.
    { wch: 12 },  // Date
    { wch: 20 },  // Customer Name
    { wch: 15 },  // Phone No.
    { wch: 25 },  // Remark 1
    { wch: 25 },  // Remark 2
    { wch: 25 },  // Remark 3
  ];

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `leads_${timestamp}.xlsx`);
};

export const importLeadsFromExcel = (file: File): Promise<LeadImportData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<LeadImportData>(worksheet);

        if (jsonData.length === 0) {
          reject(new Error('Excel file is empty'));
          return;
        }

        // Validate required columns
        const requiredColumns = ['Date', 'Customer Name', 'Phone No.'];
        const firstRow = jsonData[0];
        const missingColumns = requiredColumns.filter(col => !(col in firstRow));

        if (missingColumns.length > 0) {
          reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`));
          return;
        }

        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
};
