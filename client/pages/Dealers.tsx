import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DealersTab from "@/components/dealers/DealersTab";
import ProductsTab from "@/components/dealers/ProductsTab";
import { DealerAuditDashboard } from "@/components/DealerAuditDashboard";
import {
  fetchDMSDealers,
  addDMSDealer,
  deleteDMSDealer,
  updateDMSDealer,
  fetchProducts,
  addProduct as dbAddProduct,
  deleteProduct as dbDeleteProduct,
  Dealer,
} from "@/lib/dealers";

export default function Dealers() {
  const navigate = useNavigate();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dealersData, productsData] = await Promise.all([
        fetchDMSDealers(),
        fetchProducts(),
      ]);
      setDealers(dealersData || []);
      setProducts(productsData || []);
    } catch (error) {
      console.error("Error loading dealers or products:", error);
      setDealers([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const addDealer = async (dealer: Omit<Dealer, "id">) => {
    try {
      const newDealer = await addDMSDealer(dealer as any);
      if (newDealer) {
        setDealers([...dealers, newDealer]);
        return true;
      } else {
        console.error("Failed to add dealer: No data returned from insert");
        return false;
      }
    } catch (error) {
      console.error("Error in addDealer:", error);
      return false;
    }
  };

  const updateDealer = async (id: string, updatedDealer: Omit<Dealer, "id">) => {
    try {
      const result = await updateDMSDealer(id, updatedDealer as any);
      if (result) {
        setDealers(dealers.map((d) => (d.id === id ? { ...result, id } : d)));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating dealer:", error);
      return false;
    }
  };

  const deleteDealer = async (id: string) => {
    const success = await deleteDMSDealer(id);
    if (success) {
      setDealers(dealers.filter((d) => d.id !== id));
    }
  };

  const addProduct = async (product: any) => {
    const newProduct = await dbAddProduct(product);
    if (newProduct) {
      setProducts([...products, newProduct]);
    }
  };

  const deleteProduct = async (id: string) => {
    const success = await dbDeleteProduct(id);
    if (success) {
      setProducts(products.filter((p) => p.id !== id));
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dealers</h1>
              <p className="text-muted-foreground">
                Manage dealers and their products
              </p>
            </div>
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>

          <Tabs defaultValue="audit" className="w-full">
            <TabsList>
              <TabsTrigger value="audit">Dealer Audit</TabsTrigger>
              <TabsTrigger value="dealers">Manage Dealers</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
            </TabsList>

            <TabsContent value="audit" className="space-y-6">
              <DealerAuditDashboard />
            </TabsContent>

            <TabsContent value="dealers" className="space-y-6">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading dealers...</p>
                </div>
              ) : (
                <DealersTab
                  dealers={dealers}
                  onAddDealer={addDealer}
                  onUpdateDealer={updateDealer}
                  onDeleteDealer={deleteDealer}
                />
              )}
            </TabsContent>

            <TabsContent value="products" className="space-y-6">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading products...</p>
                </div>
              ) : (
                <ProductsTab
                  dealers={dealers}
                  products={products}
                  onAddProduct={addProduct}
                  onDeleteProduct={deleteProduct}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
