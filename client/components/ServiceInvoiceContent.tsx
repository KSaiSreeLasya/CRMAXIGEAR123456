interface ServiceInvoiceRecord {
  id: string;
  serviceInvoiceNo: string;
  customerName: string;
  contactNo: string;
  location: string;
  product: string;
  productDescription: string;
  invoiceDate: string;
  amount: number;
  createdAt: string;
}

interface ServiceInvoiceContentProps {
  invoice: ServiceInvoiceRecord & { unit?: number; total?: number };
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

export default function ServiceInvoiceContent({
  invoice,
  gstType,
  forPrint = false,
}: ServiceInvoiceContentProps) {
  const baseAmount = invoice.total || invoice.amount || 0;
  const taxableAmount = baseAmount;
  const gstAmount = roundCurrency(baseAmount * 0.05);
  const totalAmount = roundCurrency(baseAmount + gstAmount);
  const igstAmount = gstType === "igst" ? gstAmount : 0;
  const cgstAmount = gstType === "cgst-sgst" ? roundCurrency(gstAmount / 2) : 0;
  const sgstAmount = gstType === "cgst-sgst" ? roundCurrency(gstAmount - cgstAmount) : 0;

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
        <h2 className="text-3xl font-bold text-green-700 mb-2">SERVICE INVOICE</h2>
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
          <p className="font-bold text-lg">{invoice.serviceInvoiceNo}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 font-bold">Invoice Date:</p>
          <p className="font-semibold">{invoice.invoiceDate || invoice.createdAt}</p>
        </div>
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
          <p className="font-bold text-gray-900">{invoice.customerName}</p>
          <p className="text-gray-700">{invoice.contactNo}</p>
          <p className="text-gray-700">{invoice.location}</p>
        </div>
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

  const itemsTable = (
    <div className="mb-6">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-200 border-2 border-gray-400">
            <th className="border border-gray-400 px-3 py-2 text-left text-xs font-bold text-gray-700">
              S.NO
            </th>
            <th className="border border-gray-400 px-3 py-2 text-left text-xs font-bold text-gray-700">
              Description
            </th>
            <th className="border border-gray-400 px-3 py-2 text-left text-xs font-bold text-gray-700">
              Details
            </th>
            <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold text-gray-700">
              Unit
            </th>
            <th className="border border-gray-400 px-3 py-2 text-right text-xs font-bold text-gray-700">
              Amount
            </th>
            <th className="border border-gray-400 px-3 py-2 text-right text-xs font-bold text-gray-700">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-2 border-gray-400">
            <td className="border border-gray-400 px-3 py-2">1</td>
            <td className="border border-gray-400 px-3 py-2">
              <p className="font-bold text-gray-900">{invoice.product}</p>
            </td>
            <td className="border border-gray-400 px-3 py-2 text-sm text-gray-700">
              {invoice.productDescription}
            </td>
            <td className="border border-gray-400 px-3 py-2 text-center font-semibold text-gray-900">
              {invoice.unit || 1}
            </td>
            <td className="border border-gray-400 px-3 py-2 text-right font-bold text-gray-900">
              ₹{(invoice.amount || 0).toFixed(2)}
            </td>
            <td className="border border-gray-400 px-3 py-2 text-right font-bold text-gray-900">
              ₹{(invoice.total || invoice.amount || 0).toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const taxSummary = (
    <div className="grid grid-cols-2 gap-6 mb-6">
      <div></div>
      <div className="border-2 border-gray-400">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-gray-400">
              <td className="px-3 py-2 text-right text-gray-700 font-semibold">
                Taxable Amount:
              </td>
              <td className="px-3 py-2 text-right font-bold text-gray-900">
                ₹{taxableAmount.toFixed(2)}
              </td>
            </tr>
            {gstType === "cgst-sgst" ? (
              <>
                <tr className="border-b border-gray-400">
                  <td className="px-3 py-2 text-right text-gray-700 font-semibold">
                    CGST (2.5%):
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-gray-900">
                    ₹{cgstAmount.toFixed(2)}
                  </td>
                </tr>
                <tr className="border-b border-gray-400">
                  <td className="px-3 py-2 text-right text-gray-700 font-semibold">
                    SGST (2.5%):
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-gray-900">
                    ₹{sgstAmount.toFixed(2)}
                  </td>
                </tr>
              </>
            ) : (
              <tr className="border-b border-gray-400">
                <td className="px-3 py-2 text-right text-gray-700 font-semibold">
                  IGST (5%):
                </td>
                <td className="px-3 py-2 text-right font-bold text-gray-900">
                  ₹{igstAmount.toFixed(2)}
                </td>
              </tr>
            )}
            <tr className="bg-green-100">
              <td className="px-3 py-2 text-right font-bold text-gray-900">
                TOTAL AMOUNT:
              </td>
              <td className="px-3 py-2 text-right font-bold text-lg text-green-700">
                ₹{totalAmount.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const termsBlock = (
    <div className="border-t-2 border-gray-400 pt-4 text-xs text-gray-700 space-y-2">
      <p>
        <span className="font-bold">Terms & Conditions:</span>
      </p>
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li>Payment should be made within 30 days of invoice date</li>
        <li>Cheques should be drawn in favor of "AXIGEAR ELECTRIC LOUNGE"</li>
        <li>All disputes are subject to Hyderabad jurisdiction only</li>
        <li>This is a computer generated invoice. No signature required.</li>
      </ul>
    </div>
  );

  return (
    <div className={containerClass}>
      {invoiceHeaderBlock}
      {billToBlock}
      {itemsTable}
      {taxSummary}
      {termsBlock}
    </div>
  );
}
