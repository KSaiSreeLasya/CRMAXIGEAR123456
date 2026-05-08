import type { Project } from "@/pages/Projects";

interface InvoiceContentProps {
  project: Project;
  invoiceNo: string;
  gstType: "igst" | "cgst-sgst";
  placeOfSupply: string;
  forPrint?: boolean;
}

const COMPANY_INFO = {
  name: "AXIGEAR AUTO VENTURES LLP",
  address: "SY 02, PLOT NO.148, MYTHRI NAGAR, MADINAGUDA",
  city: "HYDERABAD, TELANGANA, INDIA 500049",
  gstin: "36ACJFA4386L1ZW",
  pan: "ACJFA4386L",
  llpin: "ACN-4885",
  bank: {
    name: "IDFC FIRST BANK",
    accountNo: "69392193637",
    ifscCode: "IDFB0080205",
    location: "Gachibowli",
  },
};

export default function InvoiceContent({
  project,
  invoiceNo,
  gstType,
  placeOfSupply,
  forPrint = false,
}: InvoiceContentProps) {
  // Calculate taxes based on GST type
  const baseAmount = project.amount;
  let igstAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let totalAmount = baseAmount;

  if (gstType === "igst") {
    igstAmount = baseAmount * 0.05;
    totalAmount = baseAmount + igstAmount;
  } else {
    cgstAmount = baseAmount * 0.025;
    sgstAmount = baseAmount * 0.025;
    totalAmount = baseAmount + cgstAmount + sgstAmount;
  }

  const containerClass = forPrint
    ? "bg-white text-black p-12 w-full print:p-12"
    : "bg-white text-black p-8 md:p-12 max-w-5xl mx-auto rounded-lg border-2 border-gray-300 shadow-lg";

  return (
    <div id="invoice-container" className={containerClass}>
      {/* Header Section */}
      <div className="grid grid-cols-3 gap-6 mb-6 pb-6 border-b-2 border-gray-400">
        {/* Company Info with Logo */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2F59bf3e928fc9473a97d5e87470c824bb%2F8b737424d5b445559a46780e8d2b4449?format=webp&width=800&height=1200"
              alt="AXIGEAR Logo"
              className="w-16 h-16 object-contain flex-shrink-0"
            />
            <h1 className="text-lg font-bold leading-tight">
              {COMPANY_INFO.name}
            </h1>
          </div>
          <div className="text-xs space-y-0.5 text-gray-700">
            <p className="font-medium text-xs">{COMPANY_INFO.address}</p>
            <p className="font-medium text-xs">{COMPANY_INFO.city}</p>
            <p className="mt-3">
              <span className="font-bold">GSTIN/UIN:</span> {COMPANY_INFO.gstin}
            </p>
            <p>
              <span className="font-bold">PAN:</span> {COMPANY_INFO.pan}
            </p>
            <p>
              <span className="font-bold">LLPIN:</span> {COMPANY_INFO.llpin}
            </p>
          </div>
        </div>

        {/* Invoice Title */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-green-700 mb-2">TAX INVOICE</h2>
          <p className="text-xs text-gray-600 font-semibold leading-snug">
            Issued u/s 31(1) of CGST Act, 2017 r.w.t Rule 46 of CGST Rules, 2017
          </p>
          <div className="mt-6 p-3 border-2 border-gray-400 rounded bg-gray-50">
            <p className="text-xs text-gray-700 italic font-semibold">
              Original for Recipient
            </p>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="text-sm space-y-3 text-right border-l-2 border-gray-300 pl-6">
          <div>
            <p className="text-xs text-gray-600 font-bold">Invoice No:</p>
            <p className="font-bold text-lg">{invoiceNo}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 font-bold">Date:</p>
            <p className="font-semibold">{project.createdAt}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 font-bold">Place of Supply:</p>
            <p className="font-semibold">36-{placeOfSupply}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 font-bold">Reverse Charge:</p>
            <p className="font-semibold">NO</p>
          </div>
        </div>
      </div>

      {/* Bill To Section */}
      <div className="mb-6 p-3 bg-gray-50 border-2 border-gray-300 rounded">
        <h3 className="font-bold text-sm mb-3 text-gray-800">Bill To:</h3>
        <div className="text-sm space-y-2">
          <p>
            <span className="font-bold text-gray-800">Customer Name:</span>{" "}
            <span className="text-gray-700">{project.customerName}</span>
          </p>
          <p>
            <span className="font-bold text-gray-800">Address:</span>{" "}
            <span className="text-gray-700">{project.location}</span>
          </p>
          <p>
            <span className="font-bold text-gray-800">Contact No:</span>{" "}
            <span className="text-gray-700">{project.contactNo}</span>
          </p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-6 border-2 border-gray-400">
        <thead>
          <tr className="bg-green-100">
            <th className="border border-gray-400 px-3 py-2 text-left text-xs font-bold text-gray-800 w-12">
              #
            </th>
            <th className="border border-gray-400 px-3 py-2 text-left text-xs font-bold text-gray-800">
              Product Description
            </th>
            <th className="border border-gray-400 px-3 py-2 text-left text-xs font-bold text-gray-800 w-20">
              HSN
            </th>
            <th className="border border-gray-400 px-3 py-2 text-right text-xs font-bold text-gray-800 w-32">
              Amount (INR)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="hover:bg-gray-50">
            <td className="border border-gray-400 px-3 py-2 text-xs text-gray-800">
              1
            </td>
            <td className="border border-gray-400 px-3 py-2 text-xs text-gray-800">
              {project.productDescription}
            </td>
            <td className="border border-gray-400 px-3 py-2 text-xs font-mono text-gray-800">
              {project.hsnNo}
            </td>
            <td className="border border-gray-400 px-3 py-2 text-xs text-right font-semibold text-gray-800">
              {baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Tax Summary */}
      <div className="mb-4 grid grid-cols-2 gap-6">
        <div></div>
        <div className="space-y-3">
          <div className="flex justify-between text-sm border-b-2 border-gray-300 pb-2">
            <span className="font-semibold text-gray-800">Total Value</span>
            <span className="font-bold text-gray-800">
              {baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          {gstType === "igst" ? (
            <>
              <div className="flex justify-between text-sm border-b-2 border-gray-300 pb-2">
                <span className="font-semibold text-gray-800">IGST VALUE (5%)</span>
                <span className="font-bold text-gray-800">
                  {igstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm border-b-2 border-gray-300 pb-2">
                <span className="font-semibold text-gray-800">CGST VALUE</span>
                <span className="font-bold text-gray-800">-</span>
              </div>
              <div className="flex justify-between text-sm border-b-2 border-gray-300 pb-2">
                <span className="font-semibold text-gray-800">SGST VALUE</span>
                <span className="font-bold text-gray-800">-</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-sm border-b-2 border-gray-300 pb-2">
                <span className="font-semibold text-gray-800">IGST VALUE</span>
                <span className="font-bold text-gray-800">-</span>
              </div>
              <div className="flex justify-between text-sm border-b-2 border-gray-300 pb-2">
                <span className="font-semibold text-gray-800">CGST VALUE (2.5%)</span>
                <span className="font-bold text-gray-800">
                  {cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm border-b-2 border-gray-300 pb-2">
                <span className="font-semibold text-gray-800">SGST VALUE (2.5%)</span>
                <span className="font-bold text-gray-800">
                  {sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between text-lg font-bold pt-3 border-t-2 border-green-600">
            <span className="text-gray-800">INVOICE VALUE</span>
            <span className="text-green-700">
              {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}{" "}
              INR
            </span>
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div className="mb-4 p-3 bg-green-50 border-2 border-green-300 rounded">
        <p className="text-sm text-gray-800">
          <span className="font-bold">Amount in words:</span>{" "}
          {formatAmountInWords(Math.round(totalAmount))}
        </p>
      </div>

      {/* Bank Details */}
      <div className="mb-4 pb-4 border-b-2 border-gray-300">
        <h3 className="font-bold mb-4 text-sm text-gray-800">
          Bank Details - Beneficiary Bank Details
        </h3>
        <div className="text-sm space-y-2 text-gray-700">
          <p>
            <span className="font-bold text-gray-800">Bank A/c No -</span>{" "}
            {COMPANY_INFO.bank.accountNo}
          </p>
          <p>
            <span className="font-bold text-gray-800">Bank -</span>{" "}
            {COMPANY_INFO.bank.name}
          </p>
          <p>
            <span className="font-bold text-gray-800">IFSC Code -</span>{" "}
            {COMPANY_INFO.bank.ifscCode}
          </p>
          <p>
            <span className="font-bold text-gray-800">Location -</span>{" "}
            {COMPANY_INFO.bank.location}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-600 space-y-1">
        <p className="italic text-gray-700 text-xs">
          *This is a computer generated invoice and doesn't need a signature*
        </p>
        <p className="font-bold text-gray-800 text-xs">
          {COMPANY_INFO.name}
        </p>
        <p className="text-xs text-gray-600 leading-tight">
          Plot no.102, 103, Sri Krishna Vihar, Temple Lane, Mythri Nagar Phase-2,
          Mathrusri Nagar, Madinaguda, Serilingampally, K.V.Rangareddy- 500049,
          Telangana, India
        </p>
      </div>
    </div>
  );
}

// Helper function to convert amount to words
function formatAmountInWords(amount: number): string {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const tens = [
    "",
    "Ten",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const scales = ["", "Thousand", "Lakh", "Crore"];

  if (amount === 0) return "Zero";

  let result = "";
  let scaleIndex = 0;

  while (amount > 0) {
    const remainder = amount % (scaleIndex === 0 ? 1000 : 100);
    if (remainder !== 0) {
      result =
        convertHundreds(remainder, ones, tens) +
        " " +
        scales[scaleIndex] +
        " " +
        result;
    }
    amount = Math.floor(amount / (scaleIndex === 0 ? 1000 : 100));
    scaleIndex++;
  }

  return result.trim() + " Rupees Only";
}

function convertHundreds(
  num: number,
  ones: string[],
  tens: string[]
): string {
  let result = "";

  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;

  if (hundreds > 0) {
    result += ones[hundreds] + " Hundred ";
  }

  if (remainder >= 10) {
    const tensDigit = Math.floor(remainder / 10);
    const onesDigit = remainder % 10;

    if (tensDigit === 1) {
      const teens = [
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
      ];
      result += teens[onesDigit];
    } else {
      result += tens[tensDigit];
      if (onesDigit > 0) {
        result += " " + ones[onesDigit];
      }
    }
  } else if (remainder > 0) {
    result += ones[remainder];
  }

  return result.trim();
}
