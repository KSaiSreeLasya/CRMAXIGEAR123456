interface InvoiceItem {
  name: string;
  quantity: number;
  pricePerUnit?: number;
  price?: number;
}

interface InvoiceData {
  invoice_no?: string;
  invoiceNo?: string;
  customer_name?: string;
  customerName?: string;
  customer_phone?: string;
  customerPhone?: string;
  date?: string;
  total_amount?: number;
  totalAmount?: number;
  dealerId?: string;
  items?: InvoiceItem[];
  products?: InvoiceItem[];
  [key: string]: any;
}

export function downloadTaxInvoiceHTML(invoiceData: InvoiceData, type: 'sale' | 'service') {
  const formatCurrency = (val: number) => {
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const invoiceNo = invoiceData.invoice_no || invoiceData.invoiceNo || 'N/A';
  const customerName = invoiceData.customer_name || invoiceData.customerName || 'N/A';
  const customerPhone = invoiceData.customer_phone || invoiceData.customerPhone || 'N/A';
  const date = invoiceData.date || 'N/A';
  const totalAmount = Number(invoiceData.total_amount || invoiceData.totalAmount || 0);
  
  let itemRowsHtml = '';
  
  if (type === 'sale') {
    const items = invoiceData.items || [];
    itemRowsHtml = items.map((item: any, index: number) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${index + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${item.name}</strong></td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.pricePerUnit || item.price || 0)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency((item.quantity) * (item.pricePerUnit || item.price || 0))}</td>
      </tr>
    `).join('');
  } else {
    const products = invoiceData.products || [];
    itemRowsHtml = products.map((item: any, index: number) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${index + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${item.name}</strong></td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.price)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency((item.quantity) * (item.price))}</td>
      </tr>
    `).join('');
  }

  const documentContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>GST Tax Invoice - ${invoiceNo}</title>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 40px; }
        .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, .15); font-size: 14px; line-height: 24px; }
        .invoice-header { display: flex; justify-content: space-between; border-bottom: 3px solid #065f46; padding-bottom: 20px; margin-bottom: 25px; }
        .invoice-title { font-size: 26px; font-weight: bold; color: #065f46; text-transform: uppercase; }
        .invoice-details { margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; text-align: left; }
        th { background-color: #f6f6f6; color: #333; font-weight: bold; padding: 10px; border-bottom: 2px solid #ddd; }
        .total-section { margin-top: 30px; text-align: right; font-size: 16px; font-weight: bold; color: #065f46; }
        @media print {
          body { padding: 0; }
          .invoice-box { border: none; box-shadow: none; }
          .print-btn { display: none; }
        }
      </style>
    </head>
    <body>
      <div style="max-width: 800px; margin: 0 auto 15px auto; text-align: right;">
        <button class="print-btn" onclick="window.print()" style="padding: 8px 16px; background: #065f46; color: white; font-weight: bold; border: none; border-radius: 4px; cursor: pointer;">Print Invoice / PDF</button>
      </div>
      <div class="invoice-box">
        <div class="invoice-header">
          <div>
            <div class="invoice-title">AXIGEAR ELECTRIC</div>
            <div>Central Corporate Head Office</div>
            <div>GSTIN: 27AAACA9999A1Z1</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 18px; font-weight: bold; color: #555;">TAX INVOICE</div>
            <div><strong>Invoice No:</strong> ${invoiceNo}</div>
            <div><strong>Date:</strong> ${date}</div>
          </div>
        </div>

        <div class="invoice-details" style="display: flex; justify-content: space-between;">
          <div>
            <strong>Billing Address:</strong><br>
            ${customerName}<br>
            Contact No: ${customerPhone}
          </div>
          <div style="text-align: right;">
            <strong>Issued By Franchise Branch ID:</strong><br>
            ${invoiceData.dealerId || 'Central HQ'}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 10%; text-align: center;">S.No</th>
              <th style="width: 50%;">Description of Goods / Services</th>
              <th style="width: 10%; text-align: center;">Qty</th>
              <th style="width: 15%; text-align: right;">Unit Price</th>
              <th style="width: 15%; text-align: right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowsHtml}
          </tbody>
        </table>

        <div class="total-section">
          Total Amount (Inclusive of GST): ${formatCurrency(totalAmount)}
        </div>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([documentContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Tax_Invoice_${invoiceNo}.html`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
