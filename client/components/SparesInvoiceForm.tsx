import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { ProductRow, InvoiceForm } from "@/types/invoice";

const DEFAULT_PRODUCT_ROW: ProductRow = {
  id: "",
  product: "",
  productDescription: "",
  amount: 0,
  unit: 1,
  gstRate: 18,
};

interface SparesInvoiceFormProps {
  form: InvoiceForm;
  onFormChange: (form: InvoiceForm) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  isEditing: boolean;
  dealers: any[];
  calculateTotal: (products: ProductRow[], labour: number) => any;
}

export function SparesInvoiceForm({
  form,
  onFormChange,
  onSave,
  onCancel,
  isSaving,
  isEditing,
  dealers,
  calculateTotal,
}: SparesInvoiceFormProps) {
  return (
    <div className="border rounded-lg p-6 bg-card">
      <h2 className="text-xl font-semibold mb-6">
        {isEditing ? "Edit Spares Invoice" : "Create New Spares Invoice"}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Invoice Number
          </label>
          <input
            type="text"
            value={form.dealerInvoiceNo}
            onChange={(e) =>
              onFormChange({ ...form, dealerInvoiceNo: e.target.value })
            }
            className="w-full px-3 py-2 border rounded-md"
            placeholder="e.g., SPARE/2026-27/001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Dealer Name
          </label>
          <input
            type="text"
            list="spares-dealer-list"
            value={form.dealerName}
            onChange={(e) =>
              onFormChange({ ...form, dealerName: e.target.value })
            }
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Select or enter dealer name"
          />
          <datalist id="spares-dealer-list">
            {dealers.map((dealer) => (
              <option key={dealer.id} value={dealer.name} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Contact No
          </label>
          <input
            type="tel"
            value={form.contactNo}
            onChange={(e) =>
              onFormChange({ ...form, contactNo: e.target.value })
            }
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Contact number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Location
          </label>
          <input
            type="text"
            value={form.location}
            onChange={(e) =>
              onFormChange({ ...form, location: e.target.value })
            }
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Location"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Invoice Date
          </label>
          <input
            type="date"
            value={form.invoiceDate}
            onChange={(e) =>
              onFormChange({ ...form, invoiceDate: e.target.value })
            }
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Due Date
          </label>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) =>
              onFormChange({ ...form, dueDate: e.target.value })
            }
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            P.O.# (Purchase Order Number)
          </label>
          <input
            type="text"
            value={form.poNumber}
            onChange={(e) =>
              onFormChange({ ...form, poNumber: e.target.value })
            }
            className="w-full px-3 py-2 border rounded-md"
            placeholder="e.g., PO-12345"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Sent To
          </label>
          <input
            type="text"
            value={form.sentTo}
            onChange={(e) =>
              onFormChange({ ...form, sentTo: e.target.value })
            }
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Contact person name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Ship To
          </label>
          <input
            type="text"
            value={form.shipTo}
            onChange={(e) =>
              onFormChange({ ...form, shipTo: e.target.value })
            }
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Shipping address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Mode of Payment
          </label>
          <select
            value={form.modeOfPayment}
            onChange={(e) =>
              onFormChange({ ...form, modeOfPayment: e.target.value })
            }
            className="w-full px-3 py-2 border rounded-md"
          >
            <option>Cash</option>
            <option>Cheque</option>
            <option>Bank Transfer</option>
            <option>Credit Card</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Lead Source
          </label>
          <input
            type="text"
            value={form.leadSource}
            onChange={(e) =>
              onFormChange({ ...form, leadSource: e.target.value })
            }
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Lead source"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Labour Charges
          </label>
          <input
            type="number"
            value={form.labourCharges}
            onChange={(e) =>
              onFormChange({
                ...form,
                labourCharges: parseFloat(e.target.value) || 0,
              })
            }
            className="w-full px-3 py-2 border rounded-md"
            placeholder="0"
          />
        </div>
      </div>

      {/* Products Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Spares Products</h3>
        <div className="mb-2 flex gap-2 items-center text-xs font-semibold text-gray-600 px-2">
          <div className="flex-1">Product</div>
          <div className="flex-1">Description</div>
          <div className="w-20 text-right">Unit</div>
          <div className="w-24 text-right">Amount</div>
          <div className="w-20 text-center">GST Rate</div>
          <div className="w-20 text-right">Total</div>
          <div className="w-20 text-right">GST Amt</div>
        </div>
        <div className="space-y-3">
          {form.products.map((product, idx) => (
            <div key={product.id} className="flex gap-2 items-end">
              <input
                type="text"
                placeholder="Product name"
                value={product.product}
                onChange={(e) => {
                  const updated = [...form.products];
                  updated[idx].product = e.target.value;
                  onFormChange({ ...form, products: updated });
                }}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
              />
              <input
                type="text"
                placeholder="Description"
                value={product.productDescription}
                onChange={(e) => {
                  const updated = [...form.products];
                  updated[idx].productDescription = e.target.value;
                  onFormChange({ ...form, products: updated });
                }}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
              />
              <input
                type="number"
                placeholder="Unit"
                value={product.unit}
                onChange={(e) => {
                  const updated = [...form.products];
                  updated[idx].unit = parseFloat(e.target.value) || 0;
                  onFormChange({ ...form, products: updated });
                }}
                className="w-20 px-3 py-2 border rounded-md text-sm"
              />
              <input
                type="number"
                placeholder="Amount"
                value={product.amount}
                onChange={(e) => {
                  const updated = [...form.products];
                  updated[idx].amount = parseFloat(e.target.value) || 0;
                  onFormChange({ ...form, products: updated });
                }}
                className="w-24 px-3 py-2 border rounded-md text-sm"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={product.gstRate ?? 18}
                onChange={(e) => {
                  const updated = [...form.products];
                  const gstRate = Number(e.target.value);
                  updated[idx].gstRate = Number.isFinite(gstRate) ? gstRate : 0;
                  onFormChange({ ...form, products: updated });
                }}
                className="w-20 px-3 py-2 border rounded-md text-sm"
                title="GST Rate"
              />
              <span className="w-20 px-3 py-2 text-sm font-medium text-right">
                ₹{((product.amount * product.unit) + ((product.amount * product.unit * (product.gstRate ?? 18)) / 100)).toFixed(2)}
              </span>
              <span className="w-20 px-3 py-2 text-sm font-medium text-right text-blue-600">
                ₹{((product.amount * product.unit * (product.gstRate ?? 18)) / 100).toFixed(2)}
              </span>
              {form.products.length > 1 && (
                <Button
                  onClick={() => {
                    onFormChange({
                      ...form,
                      products: form.products.filter((_, i) => i !== idx),
                    });
                  }}
                  variant="outline"
                  size="sm"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button
          onClick={() => {
            onFormChange({
              ...form,
              products: [
                ...form.products,
                { ...DEFAULT_PRODUCT_ROW, id: `product_${Date.now()}` },
              ],
            });
          }}
          variant="outline"
          className="mt-3 w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Spare
        </Button>
      </div>

      {/* Summary */}
      {form.products.length > 0 && (
        <div className="bg-muted p-4 rounded-md mb-6 overflow-x-auto">
          {(() => {
            const { productTotal, taxableTotal, gstAmount, total, gstBreakdown, labourGst } =
              calculateTotal(form.products, form.labourCharges);
            return (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Product Total:</span>
                  <span>₹{productTotal.toFixed(2)}</span>
                </div>
                {form.labourCharges > 0 && (
                  <div className="flex justify-between">
                    <span>Labour Charges:</span>
                    <span>₹{form.labourCharges.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span>Taxable Value:</span>
                  <span>₹{taxableTotal.toFixed(2)}</span>
                </div>
                {form.gstEnabled && (
                  <>
                    <div className="space-y-1 pl-4">
                      {gstBreakdown?.map((breakdown, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span>GST ({breakdown.rate}%):</span>
                          <span>₹{breakdown.amount.toFixed(2)}</span>
                        </div>
                      ))}
                      {labourGst > 0 && (
                        <div className="flex justify-between text-xs">
                          <span>Labour GST (18%):</span>
                          <span>₹{labourGst.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center font-semibold border-t pt-2">
                      <span className="whitespace-nowrap">TOTAL AMOUNT:</span>
                      <span
                        className="text-green-600 whitespace-nowrap flex-shrink-0"
                        style={{ whiteSpace: "nowrap" }}
                      >
                        ₹{total.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={onSave}
          className="flex-1"
          disabled={isSaving}
        >
          {isSaving
            ? "Saving..."
            : isEditing
              ? "Update Invoice"
              : "Create Invoice"}
        </Button>
        {isEditing && (
          <Button
            onClick={onCancel}
            variant="outline"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
