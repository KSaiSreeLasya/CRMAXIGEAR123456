interface EstimationRecord {
  id: string;
  customerName: string;
  address: string;
  contactNo: string;
  model: string;
  estimationSlipNo: string;
  estimationDate: string;
  amount: number;
  createdAt: string;
}

interface EstimationSlipContentProps {
  estimation: EstimationRecord;
  forPrint?: boolean;
}

const COMPANY_INFO = {
  name: "AXIGEAR AUTO VENTURES LLP",
  address: "SY 02, PLOT NO.148, MYTHRI NAGAR, MADINAGUDA",
  city: "HYDERABAD, TELANGANA, INDIA 500049",
  bank: {
    name: "IDFC FIRST BANK",
    accountNo: "69392193637",
    ifscCode: "IDFB0080205",
    location: "Gachibowli",
  },
};

export default function EstimationSlipContent({
  estimation,
  forPrint = false,
}: EstimationSlipContentProps) {
  const baseAmount = estimation.amount;
  const gstAmount = baseAmount * 0.05;
  const totalAmount = baseAmount + gstAmount;

  const containerClass = forPrint
    ? "bg-white text-black p-12 w-full print:p-12"
    : "bg-white text-black p-8 md:p-12 max-w-5xl mx-auto rounded-lg border-2 border-gray-300 shadow-lg";

  return (
    <div id="estimation-slip-container" className={containerClass}>
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
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-green-700 mb-2">ESTIMATION SLIP</h2>
          <p className="text-xs text-gray-600 font-semibold leading-snug">
            Valid for 24 hrs from the issue date
          </p>
        </div>

        <div className="text-sm space-y-3 text-right border-l-2 border-gray-300 pl-6">
          <div>
            <p className="text-xs text-gray-600 font-bold">Estimation Slip No:</p>
            <p className="font-bold text-lg">{estimation.estimationSlipNo}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 font-bold">Date:</p>
            <p className="font-semibold">{estimation.estimationDate}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 p-3 bg-gray-50 border-2 border-gray-300 rounded">
        <h3 className="font-bold text-sm mb-3 text-gray-800">Customer Details:</h3>
        <div className="text-sm space-y-2">
          <p>
            <span className="font-bold text-gray-800">Customer Name:</span>{" "}
            <span className="text-gray-700">{estimation.customerName}</span>
          </p>
          <p>
            <span className="font-bold text-gray-800">Contact No:</span>{" "}
            <span className="text-gray-700">{estimation.contactNo}</span>
          </p>
          <p>
            <span className="font-bold text-gray-800">Address:</span>{" "}
            <span className="text-gray-700">{estimation.address}</span>
          </p>
          <p>
            <span className="font-bold text-gray-800">Model:</span>{" "}
            <span className="text-gray-700">{estimation.model}</span>
          </p>
        </div>
      </div>

      <table className="w-full mb-6 border-2 border-gray-400">
        <thead>
          <tr className="bg-green-100">
            <th className="border border-gray-400 px-3 py-2 text-left text-xs font-bold text-gray-800 w-12">
              #
            </th>
            <th className="border border-gray-400 px-3 py-2 text-left text-xs font-bold text-gray-800">
              Description
            </th>
            <th className="border border-gray-400 px-3 py-2 text-right text-xs font-bold text-gray-800 w-40">
              Amount (INR)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-400 px-3 py-2 text-xs">1</td>
            <td className="border border-gray-400 px-3 py-2 text-xs">
              Estimation cost for model - {estimation.model}
            </td>
            <td className="border border-gray-400 px-3 py-2 text-xs text-right font-semibold">
              {baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-3 py-2 text-xs">2</td>
            <td className="border border-gray-400 px-3 py-2 text-xs">GST (5%)</td>
            <td className="border border-gray-400 px-3 py-2 text-xs text-right font-semibold">
              {gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </td>
          </tr>
          <tr className="bg-gray-50">
            <td
              className="border border-gray-400 px-3 py-2 text-xs font-bold text-right"
              colSpan={2}
            >
              TOTAL ESTIMATION COST
            </td>
            <td className="border border-gray-400 px-3 py-2 text-xs text-right font-bold text-green-700">
              {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>

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
            <span className="font-bold text-gray-800">Bank -</span> {COMPANY_INFO.bank.name}
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

      <div className="text-center text-xs text-gray-600 space-y-1">
        <p className="italic text-gray-700 text-xs">
          This is a computer generated invoice and doesn't need a signature*
        </p>
        <p className="italic text-gray-700 text-xs">Estimation slip valid for 24 hrs only</p>
      </div>
    </div>
  );
}
