import { supabase } from "./supabase";
import { v4 as uuidv4 } from "uuid";

export interface Dealer {
  id?: string;
  name: string;
  code: string;
  email: string;
  password: string;
  phone?: string;
  location?: string;
  manager_name?: string;
  contact_no?: string;
  address?: string;
}

export interface DMSDealer {
  id: string;
  name: string;
  code: string;
  email: string;
  password: string;
  phone?: string;
  location: string;
  manager_name?: string;
  logo_url?: string;
  company_name?: string;
  incorporation_no?: string;
  dba_name?: string;
  legal_structure?: string;
  ownership_details?: string;
  registered_address?: string;
  document_pan?: any;
  document_gst?: any;
  document_shop_license?: any;
  document_trade_license?: any;
  created_at?: string;
}

export interface Product {
  id?: string;
  model_no: string;
  dealer_id?: string;
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
}

// DMS Dealers operations (new table)
export async function fetchDMSDealers() {
  if (!supabase) {
    console.warn("Supabase not initialized");
    return [];
  }

  try {
    console.log("Starting fetchDMSDealers...");
    const { data, error } = await supabase
      .from("dms_dealers")
      .select("*");

    if (error) {
      console.error("Error fetching DMS dealers:", error.message);
      return [];
    }

    console.log("Successfully fetched dealers:", data?.length || 0, "dealers");
    return data || [];
  } catch (err) {
    console.error("Error in fetchDMSDealers:", err);
    return [];
  }
}

export async function addDMSDealer(dealer: Omit<DMSDealer, "id" | "created_at">) {
  if (!supabase) return null;

  const dealerId = uuidv4();
  const { data, error } = await supabase
    .from("dms_dealers")
    .insert([
      {
        id: dealerId,
        name: dealer.name,
        code: dealer.code,
        email: dealer.email,
        password: dealer.password,
        phone: dealer.phone || null,
        location: dealer.location || "Not Specified",
        manager_name: dealer.manager_name || null,
      },
    ])
    .select("id,name,code,email,password,phone,location,manager_name");

  if (error) {
    console.error("Error adding DMS dealer:", error);
    console.error("Error details:", error.message, error.details);
    return null;
  }
  return data?.[0] || null;
}

export async function updateDMSDealer(id: string, dealer: Partial<Omit<DMSDealer, "id" | "created_at">>) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("dms_dealers")
    .update(dealer)
    .eq("id", id)
    .select("id,name,code,email,password,phone,location,manager_name");

  if (error) {
    console.error("Error updating DMS dealer:", error);
    return null;
  }
  return data?.[0] || null;
}

export async function deleteDMSDealer(id: string) {
  if (!supabase) return false;
  const { error } = await supabase.from("dms_dealers").delete().eq("id", id);
  if (error) {
    console.error("Error deleting DMS dealer:", error);
    return false;
  }
  return true;
}

// Dealers operations (legacy table)
export async function fetchDealers() {
  if (!supabase) return [];
  const { data, error } = await supabase.from("dealers").select("*");
  if (error) {
    console.error("Error fetching dealers:", error);
    return [];
  }
  return data || [];
}

export async function addDealer(dealer: Dealer) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("dealers")
    .insert([
      {
        name: dealer.name,
        contact_no: dealer.contact_no,
        address: dealer.address,
      },
    ])
    .select();

  if (error) {
    console.error("Error adding dealer:", error);
    return null;
  }
  return data?.[0] || null;
}

export async function deleteDealer(id: string) {
  if (!supabase) return false;
  const { error } = await supabase.from("dealers").delete().eq("id", id);
  if (error) {
    console.error("Error deleting dealer:", error);
    return false;
  }
  return true;
}

// Products operations
export async function fetchProducts() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from("products").select("*");
    if (error) {
      console.error("Error fetching products:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Error in fetchProducts:", err);
    return [];
  }
}

export async function addProduct(product: Product) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("products")
    .insert([
      {
        model_no: product.model_no,
        dealer_name: product.dealer_name,
        dealer_code: product.dealer_code,
        contact_no: product.contact_no,
        location: product.location,
        product_description: product.product_description,
        hsn_no: product.hsn_no,
        no_of_vehicles: product.no_of_vehicles,
        chassis_no: product.chassis_no,
        motor_no: product.motor_no,
        battery_no: product.battery_no,
        battery_vehicle_specs: product.battery_vehicle_specs,
        battery_warranty: product.battery_warranty,
        battery_capacity: product.battery_capacity,
        vehicle_warranty: product.vehicle_warranty,
        invoice_date: product.invoice_date,
        amount: product.amount,
        mode_of_payment: product.mode_of_payment,
      },
    ])
    .select();

  if (error) {
    console.error("Error adding product:", error);
    return null;
  }
  return data?.[0] || null;
}

export async function deleteProduct(id: string) {
  if (!supabase) return false;
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    console.error("Error deleting product:", error);
    return false;
  }
  return true;
}
