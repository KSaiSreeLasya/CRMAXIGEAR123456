import { jsPDF } from "jspdf";

// Define column mapping for each data type
export const COLUMN_MAPPINGS: Record<string, Record<string, string[]>> = {
  inventory: {
    slNo: ["sl_no", "sl no", "slno", "serial no"],
    modelNo: ["model_no", "model no", "modelno", "model"],
    brand: ["brand"],
    vehicleModel: ["vehicle_model", "vehicle model", "vehiclemodel"],
    hsnNo: ["hsn_no", "hsn no", "hsnno", "hsn"],
    vehicleCount: ["vehicle_count", "vehicle count", "vehiclecount", "count"],
    chassisNo: ["chassis_no", "chassis no", "chassisno"],
    chassisColors: ["chassis_colors", "chassis colors", "chassiscolors", "colors", "colour", "color"],
    motorNo: ["motor_no", "motor no", "motorno"],
    batteryNo: ["battery_no", "battery no", "batteryno"],
    manufacturerInvNo: ["manufacturer_inv_no", "manufacturer inv no", "inv no"],
    batteryModel: ["battery_model", "battery model", "batterymodel"],
    batteryCount: ["battery_count", "battery count", "batterycount"],
    salesCount: ["sales_count", "sales count", "salescount"],
  },
  projects: {
    modelNo: ["model_no", "model no", "modelno", "model"],
    customerName: ["customer_name", "customer name", "customername"],
    contactNo: ["contact_no", "contact no", "contactno", "phone"],
    location: ["location", "address"],
    productDescription: ["product_description", "product description", "description"],
    hsnNo: ["hsn_no", "hsn no", "hsnno", "hsn"],
    chassisNo: ["chassis_no", "chassis no", "chassisno"],
    motorNo: ["motor_no", "motor no", "motorno"],
    batteryNo: ["battery_no", "battery no", "batteryno"],
    batteryWarranty: ["battery_warranty", "battery warranty"],
    batteryCapacity: ["battery_capacity", "battery capacity"],
    vehicleWarranty: ["vehicle_warranty", "vehicle warranty"],
    invoiceDate: ["invoice_date", "invoice date", "date"],
    amount: ["amount", "price", "cost"],
    modeOfPayment: ["mode_of_payment", "mode of payment", "payment"],
    leadSource: ["lead_source", "lead source", "source"],
  },
  estimations: {
    estimationSlipNo: ["estimation_slip_no", "estimation slip no", "slip no"],
    customerName: ["customer_name", "customer name", "customername"],
    contactNo: ["contact_no", "contact no", "contactno", "phone"],
    address: ["address", "location"],
    estimationDate: ["estimation_date", "estimation date", "date"],
    model: ["model", "model name"],
    amount: ["amount", "price", "cost"],
    modeOfPayment: ["mode_of_payment", "mode of payment", "payment"],
    leadSource: ["lead_source", "lead source", "source"],
  },
  serviceInvoices: {
    serviceInvoiceNo: ["service_invoice_no", "service invoice no", "invoice no"],
    customerName: ["customer_name", "customer name", "customername"],
    contactNo: ["contact_no", "contact no", "contactno", "phone"],
    location: ["location", "address"],
    invoiceDate: ["invoice_date", "invoice date", "date"],
    product: ["product", "product name"],
    productDescription: ["product_description", "product description", "description"],
    amount: ["amount", "price", "cost"],
    unit: ["unit", "qty", "quantity"],
    labourCharges: ["labour_charges", "labour charges", "labour"],
    modeOfPayment: ["mode_of_payment", "mode of payment", "payment"],
    leadSource: ["lead_source", "lead source", "source"],
  },
};

// Parse CSV content
export const parseCSVContent = (csv: string): { headers: string[]; rows: string[][] } => {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV file must contain headers and at least one data row");
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const rows = lines.slice(1).map((line) => {
    if (!line.trim()) return null;
    return line.split(",").map((v) => v.trim().replace(/"/g, ""));
  }).filter((row) => row !== null) as string[][];

  return { headers, rows };
};

// Match header columns dynamically
export const matchColumns = (
  csvHeaders: string[],
  mapping: Record<string, string[]>
): Record<string, number> => {
  const columnMap: Record<string, number> = {};
  const usedIndices = new Set<number>();

  for (const [field, aliases] of Object.entries(mapping)) {
    for (let i = 0; i < csvHeaders.length; i++) {
      if (usedIndices.has(i)) continue;
      const csvHeader = csvHeaders[i];
      if (aliases.some((alias) => csvHeader === alias)) {
        columnMap[field] = i;
        usedIndices.add(i);
        break;
      }
    }
  }

  return columnMap;
};

// Generic CSV import
export const importFromCSV = async (
  file: File,
  dataType: keyof typeof COLUMN_MAPPINGS
): Promise<Record<string, any>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const { headers, rows } = parseCSVContent(csv);
        const columnMap = matchColumns(headers, COLUMN_MAPPINGS[dataType]);

        if (Object.keys(columnMap).length === 0) {
          throw new Error(
            `No matching columns found. CSV headers: ${headers.join(", ")}`
          );
        }

        const records: Record<string, any>[] = [];
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const record: Record<string, any> = {};

          for (const [field, colIndex] of Object.entries(columnMap)) {
            const colIndexNum = typeof colIndex === 'string' ? parseInt(colIndex, 10) : colIndex;
            const value = row[colIndexNum];

            // Handle numeric fields
            if (["vehicleCount", "batteryCount", "salesCount", "count", "amount", "price", "qty", "unit"].includes(field)) {
              record[field] = value ? parseInt(value, 10) : 0;
            } else {
              record[field] = value || "";
            }
          }

          records.push(record);
        }

        resolve(records);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};

// Generic Excel import (same as CSV for now)
export const importFromExcel = (file: File, dataType: keyof typeof COLUMN_MAPPINGS) => {
  return importFromCSV(file, dataType);
};

// Export to CSV
export const exportToCSV = (
  data: any[],
  headers: string[],
  filename: string
) => {
  if (data.length === 0) {
    alert("No data to export");
    return;
  }

  const csv = [headers, ...data.map((item) => headers.map((h) => {
    const value = item[h] !== undefined ? item[h] : "";
    return `"${String(value).replace(/"/g, '""')}"`;
  }))].map((row) => row.join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export to Excel (CSV with BOM for UTF-8)
export const exportToExcel = (
  data: any[],
  headers: string[],
  filename: string
) => {
  if (data.length === 0) {
    alert("No data to export");
    return;
  }

  const csv = [headers, ...data.map((item) => headers.map((h) => {
    const value = item[h] !== undefined ? item[h] : "";
    return `"${String(value).replace(/"/g, '""')}"`;
  }))].map((row) => row.join(",")).join("\n");

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export to PDF
export const exportToPDF = (
  data: any[],
  headers: string[],
  filename: string,
  title: string
) => {
  if (data.length === 0) {
    alert("No data to export");
    return;
  }

  const doc = new jsPDF();
  let yPosition = 20;

  // Title
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(title, 14, yPosition);

  // Date
  yPosition += 10;
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, yPosition);

  // Table header
  yPosition += 15;
  doc.setFont(undefined, "bold");
  doc.setFillColor(41, 128, 185);
  doc.setTextColor(255, 255, 255);

  const pageWidth = 210;
  const margins = 28;
  const availableWidth = pageWidth - margins;
  const colWidth = Math.floor(availableWidth / headers.length);

  // Draw header row
  for (let i = 0; i < headers.length; i++) {
    const x = 14 + i * colWidth;
    doc.rect(x, yPosition - 5, colWidth, 8, "F");
    doc.setFontSize(8);
    doc.text(headers[i].substring(0, 15), x + 2, yPosition);
  }

  // Table data
  yPosition += 10;
  doc.setFont(undefined, "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);

  data.forEach((item) => {
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }

    for (let i = 0; i < headers.length; i++) {
      const x = 14 + i * colWidth;
      const value = item[headers[i]] !== undefined ? String(item[headers[i]]).substring(0, 20) : "";
      doc.text(value, x + 2, yPosition);
    }
    yPosition += 8;
  });

  doc.save(filename);
};
