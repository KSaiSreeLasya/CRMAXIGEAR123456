interface ProductInvoiceContentProps {
  product: {
    id?: string;
    model_no: string;
    dealer_name: string;
    dealer_code: string;
    contact_no: string;
    location: string;
    product_description: string;
    hsn_no: string;
    no_of_vehicles: number;
    chassis_no: string;
    motor_no: string;
    battery_no: string;
    battery_vehicle_specs: string;
    battery_warranty: string;
    battery_capacity: string;
    vehicle_warranty: string;
    invoice_date: string;
    amount: number;
    mode_of_payment: string;
  };
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

export default function ProductInvoiceContent({
  product,
  gstType,
  forPrint = false,
}: ProductInvoiceContentProps) {
  const amount = product.amount || 0;
  const gstAmount = roundCurrency(amount * 0.18);
  const totalAmount = roundCurrency(amount + gstAmount);
  const igstAmount = gstType === "igst" ? gstAmount : 0;
  const cgstAmount = gstType === "cgst-sgst" ? roundCurrency(gstAmount / 2) : 0;
  const sgstAmount = gstType === "cgst-sgst" ? roundCurrency(gstAmount - cgstAmount) : 0;

  const containerClass = forPrint
    ? "bg-white text-black w-full print:p-0"
    : "bg-white text-black max-w-4xl mx-auto rounded-lg shadow-lg border border-gray-200";

  return (
    <div className={containerClass}>
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 h-12"></div>

      <div className="p-8 md:p-12">
        {/* Invoice Title */}
        <h1 className="text-4xl font-bold text-gray-900 mb-8">PROFORMA INVOICE</h1>

        {/* Top Section: Sent To / Ship To / Invoice Details */}
        <div className="grid grid-cols-3 gap-8 mb-8 pb-8 border-b-2 border-gray-300">
          {/* Sent To */}
          <div>
            <p className="text-xs font-bold text-gray-600 mb-3">BILLED BY</p>
            <div className="text-sm space-y-1 text-gray-900">
              <p className="font-bold">{COMPANY_INFO.name}</p>
              <p>{COMPANY_INFO.address}</p>
              <p>{COMPANY_INFO.city}</p>
              <p className="text-xs text-gray-600 mt-2">
                <span className="font-bold">GSTIN:</span> {COMPANY_INFO.gstin}
              </p>
            </div>
          </div>

          {/* Ship To / Bill To */}
          <div>
            <p className="text-xs font-bold text-gray-600 mb-3">SHIP TO / BILL TO</p>
            <div className="text-sm space-y-1 text-gray-900">
              <p className="font-bold">{product.dealer_name}</p>
              <p>{product.location}</p>
              <p>{product.contact_no}</p>
              {product.dealer_code && (
                <p className="text-xs text-gray-600 mt-2">
                  <span className="font-bold">Dealer Code:</span> {product.dealer_code}
                </p>
              )}
            </div>
          </div>

          {/* Invoice Details */}
          <div className="text-right space-y-3">
            <div>
              <p className="text-xs text-gray-600 font-bold">INVOICE #</p>
              <p className="text-lg font-bold text-gray-900">{product.model_no}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-bold">INVOICE DATE</p>
              <p className="text-sm font-semibold text-gray-900">
                {product.invoice_date || new Date().toISOString().split("T")[0]}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-bold">DEALER CODE</p>
              <p className="text-sm font-semibold text-gray-900">{product.dealer_code}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-bold">HSN NO</p>
              <p className="text-sm font-semibold text-gray-900">{product.hsn_no}</p>
            </div>
          </div>
        </div>

        {/* Company Center Section */}
        <div className="text-center mb-8 pb-8 border-b-2 border-gray-300">
          <h2 className="text-2xl font-bold text-gray-900">{COMPANY_INFO.name}</h2>
          <p className="text-sm text-gray-700">{COMPANY_INFO.address}</p>
          <p className="text-sm text-gray-700">{COMPANY_INFO.city}</p>
        </div>

        {/* Product Details Table */}
        <div className="mb-8 pb-8 border-b-2 border-gray-300">
          <table className="w-full">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="text-left px-4 py-3 font-bold">DESCRIPTION</th>
                <th className="text-right px-4 py-3 font-bold">QTY</th>
                <th className="text-right px-4 py-3 font-bold">UNIT PRICE</th>
                <th className="text-right px-4 py-3 font-bold">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-4 text-sm text-gray-900">
                  <div className="font-semibold">{product.product_description}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Model: {product.model_no} | Chassis: {product.chassis_no} | Motor: {product.motor_no}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-right text-gray-900 font-semibold">
                  {product.no_of_vehicles}
                </td>
                <td className="px-4 py-4 text-sm text-right text-gray-900 font-semibold">
                  ₹{amount.toFixed(2)}
                </td>
                <td className="px-4 py-4 text-sm text-right text-gray-900 font-bold">
                  ₹{roundCurrency(amount * product.no_of_vehicles).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary Section */}
        <div className="grid grid-cols-3 gap-8 mb-8">
          {/* Empty columns for alignment */}
          <div></div>
          <div></div>

          {/* Summary Box */}
          <div className="space-y-3 text-right">
            <div className="flex justify-between text-sm border-b border-gray-300 pb-2">
              <span className="text-gray-700 font-medium">SUBTOTAL</span>
              <span className="font-semibold text-gray-900">₹{amount.toFixed(2)}</span>
            </div>

            {gstType === "igst" ? (
              <div className="flex justify-between text-sm border-b border-gray-300 pb-2">
                <span className="text-gray-700 font-medium">IGST (18%)</span>
                <span className="font-semibold text-gray-900">₹{igstAmount.toFixed(2)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-sm border-b border-gray-300 pb-2">
                  <span className="text-gray-700 font-medium">CGST (9%)</span>
                  <span className="font-semibold text-gray-900">₹{cgstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-b border-gray-300 pb-2">
                  <span className="text-gray-700 font-medium">SGST (9%)</span>
                  <span className="font-semibold text-gray-900">₹{sgstAmount.toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between pt-3 border-t-2 border-gray-900">
              <span className="text-lg font-bold text-gray-900">PROFORMA INVOICE TOTAL</span>
              <span className="text-2xl font-bold text-gray-900">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment & Warranty Section */}
        <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b-2 border-gray-300 text-sm">
          <div>
            <p className="font-bold text-gray-900 mb-3">PAYMENT TERMS</p>
            <div className="space-y-2 text-gray-700 text-xs">
              <div>
                <span className="font-medium">Mode of Payment:</span>
                <p className="text-gray-900">{product.mode_of_payment}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="font-bold text-gray-900 mb-3">PRODUCT WARRANTY</p>
            <div className="space-y-2 text-gray-700 text-xs">
              {product.battery_warranty && (
                <div>
                  <span className="font-medium">Battery Warranty:</span>
                  <p className="text-gray-900">{product.battery_warranty}</p>
                </div>
              )}
              {product.vehicle_warranty && (
                <div>
                  <span className="font-medium">Vehicle Warranty:</span>
                  <p className="text-gray-900">{product.vehicle_warranty}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="mb-8 pb-8 border-b-2 border-gray-300">
          <p className="font-bold text-gray-900 mb-3 text-sm">BANK DETAILS</p>
          <div className="grid grid-cols-2 gap-8 text-xs text-gray-700">
            <div>
              <p>
                <span className="font-bold">Bank Name:</span> {COMPANY_INFO.bank.name}
              </p>
              <p>
                <span className="font-bold">A/C No:</span> {COMPANY_INFO.bank.accountNo}
              </p>
            </div>
            <div>
              <p>
                <span className="font-bold">IFSC Code:</span> {COMPANY_INFO.bank.ifscCode}
              </p>
              <p>
                <span className="font-bold">Branch:</span> {COMPANY_INFO.bank.location}
              </p>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="grid grid-cols-2 gap-12 mb-8 pb-8">
          <div>
            <div className="h-16 border-t-2 border-gray-900"></div>
            <p className="text-xs font-bold text-gray-900 mt-2">Authorized Signatory</p>
          </div>
          <div className="text-right">
            <div className="h-16 border-t-2 border-gray-900"></div>
            <p className="text-xs font-bold text-gray-900 mt-2">For {COMPANY_INFO.name}</p>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="text-xs text-gray-700 space-y-3">
          <div>
            <p className="font-bold text-gray-900 mb-2">TERMS & CONDITIONS</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Goods once sold cannot be taken back.</li>
              <li>Interest will be charged @18% per annum if payment is not made within 30 days.</li>
              <li>Cheques are subject to clearance.</li>
              <li>All disputes are subject to Hyderabad jurisdiction only.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 h-8"></div>
    </div>
  );
}
