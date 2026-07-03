import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Dealer {
  id: string;
  name: string;
  [key: string]: any;
}

export interface InventoryItem {
  id: string;
  dealer_id: string;
  [key: string]: any;
}

export interface Sale {
  id: string;
  dealer_id: string;
  invoice_no: string;
  customer_name: string;
  date: string;
  total_amount: number;
  items?: SaleItem[];
  [key: string]: any;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  name: string;
  quantity: number;
  pricePerUnit: number;
  price?: number;
  [key: string]: any;
}

export interface ServiceInvoice {
  id: string;
  dealer_id: string;
  invoice_no: string;
  customer_name: string;
  date: string;
  total_amount: number;
  products?: ServiceInvoiceItem[];
  [key: string]: any;
}

export interface ServiceInvoiceItem {
  id: string;
  service_invoice_id: string;
  name: string;
  quantity: number;
  price: number;
  [key: string]: any;
}

export function useLiveDealerNetwork(selectedDealerId: string | null) {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [services, setServices] = useState<ServiceInvoice[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Pull the Directory of Registered Dealers
  useEffect(() => {
    async function fetchDealers() {
      try {
        const { data, error } = await supabase
          .from('dms_dealers')
          .select('*')
          .order('name', { ascending: true });
        if (!error && data) setDealers(data);
      } catch (err) {
        console.error('Error fetching dealers:', err);
      }
    }
    fetchDealers();
  }, []);

  // 2. Fetch Live Specific Dealer Assets & Compliance Records
  useEffect(() => {
    if (!selectedDealerId) return;

    let isMounted = true;
    async function fetchLiveDealerMetrics() {
      setLoading(true);
      try {
        // A. Live Dealer Inventory Stock
        const { data: invData } = await supabase
          .from('dms_inventory_items')
          .select('*')
          .eq('dealer_id', selectedDealerId);

        // B. Live Dealer Retail Sales & Items
        const { data: salesData } = await supabase
          .from('dms_sales')
          .select('*')
          .eq('dealer_id', selectedDealerId)
          .order('date', { ascending: false });

        let completeSalesList: Sale[] = [];
        if (salesData && salesData.length > 0) {
          const { data: items } = await supabase
            .from('dms_sale_items')
            .select('*')
            .in('sale_id', salesData.map(s => s.id));

          completeSalesList = salesData.map(s => ({
            ...s,
            items: items ? items.filter((item: any) => item.sale_id === s.id) : []
          }));
        }

        // C. Live Workshop Repair Service Jobs
        const { data: serviceInvoices } = await supabase
          .from('dms_service_invoices')
          .select('*')
          .eq('dealer_id', selectedDealerId)
          .order('date', { ascending: false });

        let completeServicesList: ServiceInvoice[] = [];
        if (serviceInvoices && serviceInvoices.length > 0) {
          const { data: serviceItems } = await supabase
            .from('dms_service_invoice_items')
            .select('*')
            .in('service_invoice_id', serviceInvoices.map(s => s.id));

          completeServicesList = serviceInvoices.map(s => ({
            ...s,
            products: serviceItems ? serviceItems.filter((item: any) => item.service_invoice_id === s.id) : []
          }));
        }

        if (isMounted) {
          if (invData) setInventory(invData);
          setSales(completeSalesList);
          setServices(completeServicesList);
        }
      } catch (err) {
        console.error('Error fetching dealer records:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchLiveDealerMetrics();
    return () => { isMounted = false; };
  }, [selectedDealerId]);

  return { dealers, inventory, sales, services, loading };
}
