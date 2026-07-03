import { useState } from 'react';
import { useLiveDealerNetwork } from '@/hooks/use-live-dealer-network';
import { DocumentPreviewer } from './DocumentPreviewer';
import { downloadTaxInvoiceHTML } from '@/lib/invoice-generator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Package, Wrench } from 'lucide-react';

export function DealerAuditDashboard() {
  const [selectedDealerId, setSelectedDealerId] = useState<string | null>(null);
  const { dealers, inventory, sales, services, loading } = useLiveDealerNetwork(selectedDealerId);

  const selectedDealer = dealers.find(d => d.id === selectedDealerId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Dealer Audit Dashboard</h2>
        <p className="text-muted-foreground">
          Real-time compliance, sales, inventory, and workshop audit tracking
        </p>
      </div>

      {/* Dealer Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Dealer</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedDealerId || ''} onValueChange={setSelectedDealerId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a dealer to audit..." />
            </SelectTrigger>
            <SelectContent>
              {dealers.map(dealer => (
                <SelectItem key={dealer.id} value={dealer.id}>
                  {dealer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedDealer && (
        <>
          {/* Compliance Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Documents</CardTitle>
              <CardDescription>
                Review and download dealer compliance attachments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pan" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="pan">PAN Card</TabsTrigger>
                  <TabsTrigger value="gst">GST Cert</TabsTrigger>
                  <TabsTrigger value="shop">Shop License</TabsTrigger>
                  <TabsTrigger value="trade">Trade License</TabsTrigger>
                </TabsList>

                <TabsContent value="pan" className="mt-4">
                  <DocumentPreviewer 
                    doc={selectedDealer.document_pan ? 
                      { base64: selectedDealer.document_pan, name: 'PAN Certificate', type: 'pan' } 
                      : null
                    }
                  />
                </TabsContent>

                <TabsContent value="gst" className="mt-4">
                  <DocumentPreviewer 
                    doc={selectedDealer.document_gst ? 
                      { base64: selectedDealer.document_gst, name: 'GST Certificate', type: 'gst' } 
                      : null
                    }
                  />
                </TabsContent>

                <TabsContent value="shop" className="mt-4">
                  <DocumentPreviewer 
                    doc={selectedDealer.document_shop_license ? 
                      { base64: selectedDealer.document_shop_license, name: 'Shop License', type: 'shop' } 
                      : null
                    }
                  />
                </TabsContent>

                <TabsContent value="trade" className="mt-4">
                  <DocumentPreviewer 
                    doc={selectedDealer.document_trade_license ? 
                      { base64: selectedDealer.document_trade_license, name: 'Trade License', type: 'trade' } 
                      : null
                    }
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Live Inventory */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Live Inventory Stock
              </CardTitle>
              <CardDescription>
                Current dealer inventory items and stock levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading inventory...</p>
              ) : inventory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left">Item Name</th>
                        <th className="px-4 py-2 text-right">Quantity</th>
                        <th className="px-4 py-2 text-right">Unit Price</th>
                        <th className="px-4 py-2 text-right">Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map(item => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2">{item.name || 'N/A'}</td>
                          <td className="px-4 py-2 text-right">{item.quantity || 0}</td>
                          <td className="px-4 py-2 text-right">₹{(item.unit_price || 0).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 text-right font-semibold">
                            ₹{((item.quantity || 0) * (item.unit_price || 0)).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground">No inventory items found</p>
              )}
            </CardContent>
          </Card>

          {/* Sales Records */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Live Sales Ledger
              </CardTitle>
              <CardDescription>
                Recent retail sales and transaction records
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading sales...</p>
              ) : sales.length > 0 ? (
                <div className="space-y-4">
                  {sales.map(sale => (
                    <div key={sale.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold">Invoice #{sale.invoice_no}</p>
                          <p className="text-sm text-muted-foreground">{sale.customer_name}</p>
                          <p className="text-xs text-gray-500">{sale.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            ₹{(sale.total_amount || 0).toLocaleString('en-IN')}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadTaxInvoiceHTML(sale, 'sale')}
                            className="mt-2 flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </Button>
                        </div>
                      </div>
                      {sale.items && sale.items.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {sale.items.length} item(s)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No sales records found</p>
              )}
            </CardContent>
          </Card>

          {/* Service Records */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Workshop Service Jobs
              </CardTitle>
              <CardDescription>
                Recent repair and service invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading services...</p>
              ) : services.length > 0 ? (
                <div className="space-y-4">
                  {services.map(service => (
                    <div key={service.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold">Service Invoice #{service.invoice_no}</p>
                          <p className="text-sm text-muted-foreground">{service.customer_name}</p>
                          <p className="text-xs text-gray-500">{service.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-600">
                            ₹{(service.total_amount || 0).toLocaleString('en-IN')}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadTaxInvoiceHTML(service, 'service')}
                            className="mt-2 flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </Button>
                        </div>
                      </div>
                      {service.products && service.products.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {service.products.length} item(s)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No service records found</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
