interface ProductRow {
  product: string;
  productDescription: string;
  amount: number;
  unit: number;
  gstRate?: number;
}

interface DealerInvoiceRecord {
  id: string;
  dealerInvoiceNo: string;
  dealerName: string;
  contactNo: string;
  location: string;
  invoiceDate: string;
  dueDate?: string;
  poNumber?: string;
  sentTo?: string;
  shipTo?: string;
  products?: ProductRow[];
  product?: string;
  productDescription?: string;
  amount?: number;
  unit?: number;
  total: number;
  labourCharges?: number;
  gstEnabled?: boolean;
  gstAmount?: number;
  createdAt: string;
}

interface DealerInvoiceContentProps {
  invoice: DealerInvoiceRecord;
  gstType: "igst" | "cgst-sgst";
  forPrint?: boolean;
}

const COMPANY_INFO = {
  name: "AXIGEAR ELECTRIC LOUNGE",
  address: "SY 02, PLOT NO.148, MYTHRI NAGAR, MADINAGUDA",
  city: "HYDERABAD, TELANGANA, INDIA 500049",
  gstin: "36ACJFA4386L1ZW",
  bank: {
    name: "IDFC FIRST BANK",
    accountNo: "69392193637",
    ifscCode: "IDFB0080205",
    location: "Gachibowli",
  },
};

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export default function DealerInvoiceContent({
  invoice,
  gstType,
  forPrint = false,
}: DealerInvoiceContentProps) {
  const gstEnabled = invoice.gstEnabled !== false;
  const labourCharges = invoice.labourCharges || 0;

  const products = invoice.products || (invoice.product ? [{
    product: invoice.product,
    productDescription: invoice.productDescription || "",
    amount: invoice.amount || 0,
    unit: invoice.unit || 1,
  }] : []);

  const subtotal = products.reduce((sum, p) => sum + (p.amount * p.unit), 0);
  const subtotalWithLabour = subtotal + labourCharges;
  const taxableAmount = subtotalWithLabour;

  // Calculate GST per product based on their individual rates
  let totalProductGst = 0;
  const gstRateBreakdown: { rate: number; amount: number }[] = [];

  products.forEach((p) => {
    const productLineTotal = p.amount * p.unit;
    const rate = p.gstRate || 18;
    const gstRate = rate / 100;
    const productGst = roundCurrency(productLineTotal * gstRate);
    totalProductGst += productGst;

    // Add to breakdown
    const existingBreakdown = gstRateBreakdown.find(b => b.rate === rate);
    if (existingBreakdown) {
      existingBreakdown.amount += productGst;
    } else {
      gstRateBreakdown.push({ rate, amount: productGst });
    }
  });

  // Add labour GST (18% default)
  const labourGst = gstEnabled && labourCharges > 0 ? roundCurrency(labourCharges * 0.18) : 0;
  const gstAmount = gstEnabled ? totalProductGst + labourGst : 0;
  const totalAmount = gstEnabled ? roundCurrency(subtotalWithLabour + gstAmount) : subtotalWithLabour;
  const igstAmount = gstEnabled && gstType === "igst" ? gstAmount : 0;

  // Calculate CGST/SGST based on actual GST rates (half of each rate for CGST/SGST)
  const cgstAmount = gstEnabled && gstType === "cgst-sgst"
    ? roundCurrency(
        gstRateBreakdown.reduce((sum, b) => sum + (b.amount / 2), 0) +
        (labourCharges > 0 ? (labourGst / 2) : 0)
      )
    : 0;
  const sgstAmount = gstEnabled && gstType === "cgst-sgst" ? roundCurrency(gstAmount - cgstAmount) : 0;

  const containerClass = forPrint
    ? "bg-white text-black p-12 w-full print:p-12"
    : "bg-white text-black p-8 md:p-12 max-w-5xl mx-auto rounded-lg border-2 border-gray-300 shadow-lg";

  const invoiceHeaderBlock = (
    <div className="grid grid-cols-3 gap-6 mb-6 pb-6 border-b-2 border-gray-400">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F59bf3e928fc9473a97d5e87470c824bb%2F8b737424d5b445559a46780e8d2b4449?format=webp&width=800&height=1200"
            alt="AXIGEAR Logo"
            className="w-16 h-16 object-contain flex-shrink-0"
          />
          <h1 className="text-lg font-bold leading-tight">{COMPANY_INFO.name}</h1>
        </div>
        <div className="text-xs space-y-0.5 text-gray-700">
          <p className="font-medium text-xs">{COMPANY_INFO.address}</p>
          <p className="font-medium text-xs">{COMPANY_INFO.city}</p>
          <p className="mt-3">
            <span className="font-bold">GSTIN/UIN:</span> {COMPANY_INFO.gstin}
          </p>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-3xl font-bold text-blue-700 mb-2">DEALER INVOICE</h2>
        <p className="text-xs text-gray-600 font-semibold leading-snug">
          Issued u/s 31(1) of CGST Act, 2017 r.w.t Rule 46 of CGST Rules, 2017
        </p>
        <div className="mt-6 p-3 border-2 border-gray-400 rounded bg-gray-50">
          <p className="text-xs text-gray-700 italic font-semibold">Original for Recipient</p>
        </div>
      </div>

      <div className="text-sm space-y-3 text-right border-l-2 border-gray-300 pl-6">
        <div>
          <p className="text-xs text-gray-600 font-bold">Invoice No:</p>
          <p className="font-bold text-lg">{invoice.dealerInvoiceNo}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 font-bold">Invoice Date:</p>
          <p className="font-semibold">{invoice.invoiceDate || invoice.createdAt}</p>
        </div>
        {invoice.dueDate && (
          <div>
            <p className="text-xs text-gray-600 font-bold">Due Date:</p>
            <p className="font-semibold">{invoice.dueDate}</p>
          </div>
        )}
        {invoice.poNumber && (
          <div>
            <p className="text-xs text-gray-600 font-bold">P.O.#:</p>
            <p className="font-semibold">{invoice.poNumber}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-600 font-bold">Place of Supply:</p>
          <p className="font-semibold">36-TG</p>
        </div>
      </div>
    </div>
  );

  const billToBlock = (
    <div className="grid grid-cols-2 gap-8 mb-6 pb-6 border-b-2 border-gray-400">
      <div>
        <p className="text-xs font-bold text-gray-700 mb-2">BILL TO:</p>
        <div className="space-y-1 text-sm">
          <p className="font-bold text-gray-900">{invoice.dealerName}</p>
          <p className="text-gray-700">{invoice.contactNo}</p>
          <p className="text-gray-700">{invoice.location}</p>
        </div>
        {(invoice.sentTo || invoice.shipTo) && (
          <div className="mt-4 pt-4 border-t border-gray-300">
            {invoice.sentTo && (
              <div className="text-xs space-y-1">
                <p className="font-bold text-gray-700">Sent To:</p>
                <p className="text-gray-700">{invoice.sentTo}</p>
              </div>
            )}
            {invoice.shipTo && (
              <div className="text-xs space-y-1 mt-2">
                <p className="font-bold text-gray-700">Ship To:</p>
                <p className="text-gray-700">{invoice.shipTo}</p>
              </div>
            )}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-gray-700 mb-2">BANK DETAILS:</p>
        <div className="space-y-0.5 text-xs text-gray-700">
          <p>
            <span className="font-bold">Bank Name:</span> {COMPANY_INFO.bank.name}
          </p>
          <p>
            <span className="font-bold">A/C No:</span> {COMPANY_INFO.bank.accountNo}
          </p>
          <p>
            <span className="font-bold">IFSC:</span> {COMPANY_INFO.bank.ifscCode}
          </p>
          <p>
            <span className="font-bold">Location:</span> {COMPANY_INFO.bank.location}
          </p>
        </div>
      </div>
    </div>
  );

  const productsTableBlock = (
    <div className="mb-6 pb-6 border-b-2 border-gray-400">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-300 bg-gray-100">
            <th className="text-left px-3 py-2 font-bold text-gray-700">
              Product
            </th>
            <th className="text-left px-3 py-2 font-bold text-gray-700">
              Description
            </th>
            <th className="text-right px-3 py-2 font-bold text-gray-700">Unit</th>
            <th className="text-right px-3 py-2 font-bold text-gray-700">
              Amount (₹)
            </th>
            <th className="text-right px-3 py-2 font-bold text-gray-700">
              GST %
            </th>
            <th className="text-right px-3 py-2 font-bold text-gray-700">
              Total (₹)
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, idx) => (
            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-900 font-medium">{product.product}</td>
              <td className="px-3 py-2 text-gray-700">{product.productDescription}</td>
              <td className="px-3 py-2 text-right text-gray-700">
                {product.unit}
              </td>
              <td className="px-3 py-2 text-right text-gray-900">
                {roundCurrency(product.amount).toFixed(2)}
              </td>
              <td className="px-3 py-2 text-right text-gray-700 font-medium">
                {product.gstRate || 18}%
              </td>
              <td className="px-3 py-2 text-right text-gray-900 font-medium">
                {roundCurrency(
                  product.amount * product.unit +
                  (product.amount * product.unit * ((product.gstRate || 18) / 100))
                ).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const summaryBlock = (
    <div className="grid grid-cols-3 gap-6 mb-6">
      <div></div>
      <div></div>
      <div className="space-y-2 border-2 border-gray-300 p-4 bg-gray-50 rounded">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-gray-700">Product Total:</span>
          <span className="font-semibold text-gray-900">₹{subtotal.toFixed(2)}</span>
        </div>
        {labourCharges > 0 && (
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">Labour Charges:</span>
            <span className="font-semibold text-gray-900">₹{labourCharges.toFixed(2)}</span>
          </div>
        )}
        {gstEnabled && (
          <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-base">
            <span className="text-gray-900">TOTAL AMOUNT:</span>
            <span className="text-green-700">₹{totalAmount.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );

  const termsBlock = (
    <div className="space-y-4 text-xs text-gray-700">
      <div>
        <p className="font-bold text-gray-900 mb-1">Terms and Conditions:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Goods once sold cannot be taken back.</li>
          <li>Interest will be charged @18% per annum if payment is not made within 30 days.</li>
          <li>Cheques are subject to clearance.</li>
          <li>All disputes are subject to Hyderabad jurisdiction only.</li>
        </ul>
      </div>
      <div className="grid grid-cols-2 gap-8 pt-6 mt-6 border-t border-gray-300">
        <div>
          <p className="font-bold text-gray-900">Authorized Signatory</p>
          <div className="h-12 mt-2"></div>
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-900">For AXIGEAR ELECTRIC LOUNGE</p>
          <div className="h-12 mt-2"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={containerClass}>
      {invoiceHeaderBlock}
      {billToBlock}
      {productsTableBlock}
      {summaryBlock}
      {termsBlock}
    </div>
  );
}
