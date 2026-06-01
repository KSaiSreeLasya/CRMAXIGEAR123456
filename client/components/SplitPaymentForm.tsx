import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SplitPayment {
  amount: number;
  modeOfPayment: "Cash" | "Card" | "UPI" | "Cheque" | "Other";
  paymentDate: string;
}

interface SplitPaymentFormProps {
  totalAmount: number;
  onPaymentsChange: (payments: SplitPayment[]) => void;
  initialPayments?: SplitPayment[];
  disabled?: boolean;
}

export function SplitPaymentForm({
  totalAmount,
  onPaymentsChange,
  initialPayments = [],
  disabled = false,
}: SplitPaymentFormProps) {
  const [payments, setPayments] = useState<SplitPayment[]>(
    initialPayments.length > 0
      ? initialPayments
      : [{ amount: 0, modeOfPayment: "Cash", paymentDate: new Date().toISOString().split("T")[0] }]
  );

  const paymentMethods = ["Cash", "Card", "UPI", "Cheque", "Other"] as const;
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const remainingAmount = Math.max(0, totalAmount - totalPaid);
  const isFullyPaid = remainingAmount === 0;

  const handlePaymentChange = (index: number, field: keyof SplitPayment, value: any) => {
    const updated = [...payments];
    if (field === "amount") {
      updated[index][field] = parseFloat(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setPayments(updated);
    onPaymentsChange(updated);
  };

  const addPayment = () => {
    const newPayment: SplitPayment = {
      amount: remainingAmount,
      modeOfPayment: "Cash",
      paymentDate: new Date().toISOString().split("T")[0],
    };
    const updated = [...payments, newPayment];
    setPayments(updated);
    onPaymentsChange(updated);
  };

  const removePayment = (index: number) => {
    if (payments.length > 1) {
      const updated = payments.filter((_, i) => i !== index);
      setPayments(updated);
      onPaymentsChange(updated);
    }
  };

  const hasValidPayments = payments.some((p) => p.amount > 0);

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-sm text-gray-600">Total Invoice Amount</p>
            <p className="text-2xl font-semibold">Rs {totalAmount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Paid</p>
            <p className={cn("text-2xl font-semibold", isFullyPaid ? "text-green-600" : "text-orange-600")}>
              Rs {totalPaid.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Remaining</p>
            <p className={cn("text-2xl font-semibold", remainingAmount === 0 ? "text-green-600" : "text-red-600")}>
              Rs {remainingAmount.toFixed(2)}
            </p>
          </div>
        </div>
        {isFullyPaid && <p className="text-sm text-green-600 font-medium">✓ Payment Complete</p>}
        {!isFullyPaid && remainingAmount > 0 && (
          <p className="text-sm text-orange-600">Rs {remainingAmount.toFixed(2)} remaining</p>
        )}
        {totalPaid > totalAmount && (
          <p className="text-sm text-red-600">Over-payment by Rs {(totalPaid - totalAmount).toFixed(2)}</p>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Payment Breakdown</h3>
        {!hasValidPayments && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
            ⚠️ No payment amounts entered. Enter at least one payment amount to record split payments.
          </div>
        )}
        {payments.map((payment, index) => (
          <div key={index} className="flex gap-3 items-end bg-white p-3 rounded-lg border border-gray-200">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 block mb-1">Amount (Rs)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={payment.amount || ""}
                onChange={(e) => handlePaymentChange(index, "amount", e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="0.00"
              />
            </div>

            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 block mb-1">Payment Method</label>
              <select
                value={payment.modeOfPayment}
                onChange={(e) => handlePaymentChange(index, "modeOfPayment", e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 block mb-1">Date</label>
              <input
                type="date"
                value={payment.paymentDate}
                onChange={(e) => handlePaymentChange(index, "paymentDate", e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            <button
              onClick={() => removePayment(index)}
              disabled={disabled || payments.length === 1}
              className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title={payments.length === 1 ? "At least one payment is required" : "Remove payment"}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addPayment}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus size={16} />
        Add Another Payment Method
      </button>
    </div>
  );
}
