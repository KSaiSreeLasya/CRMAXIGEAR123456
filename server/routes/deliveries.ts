import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const getSupabaseClient = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase configuration missing");
  }

  return createClient(supabaseUrl, supabaseKey, {
    realtime: {
      transport: ws as any,
    },
  });
};

export const handleGetDeliveries: RequestHandler = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("deliveries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        error: `Failed to fetch deliveries: ${error.message}`,
      });
    }

    return res.json(data || []);
  } catch (err: any) {
    console.error("Get deliveries error:", err);
    return res.status(500).json({
      error: err.message || "An error occurred",
    });
  }
};

export const handleCreateDelivery: RequestHandler = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { project_name, deliverables, delivery_date, status } = req.body;

    if (!project_name || !deliverables || !delivery_date) {
      return res.status(400).json({
        error: "Missing required fields: project_name, deliverables, delivery_date",
      });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("deliveries")
      .insert({
        project_name: project_name.trim(),
        deliverables: deliverables.trim(),
        delivery_date,
        status: status || "pending",
      })
      .select();

    if (error) {
      return res.status(500).json({
        error: `Failed to create delivery: ${error.message}`,
      });
    }

    const delivery = data?.[0];
    if (!delivery) {
      return res.status(500).json({
        error: "Delivery was not created",
      });
    }

    return res.status(201).json(delivery);
  } catch (err: any) {
    console.error("Create delivery error:", err);
    return res.status(500).json({
      error: err.message || "An error occurred",
    });
  }
};

export const handleUpdateDelivery: RequestHandler = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { id } = req.params;
    const { project_name, deliverables, delivery_date, status } = req.body;

    if (!id) {
      return res.status(400).json({
        error: "Delivery ID is required",
      });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("deliveries")
      .update({
        project_name: project_name?.trim(),
        deliverables: deliverables?.trim(),
        delivery_date,
        status,
      })
      .eq("id", id)
      .select();

    if (error) {
      return res.status(500).json({
        error: `Failed to update delivery: ${error.message}`,
      });
    }

    const delivery = data?.[0];
    if (!delivery) {
      return res.status(404).json({
        error: "Delivery not found",
      });
    }

    return res.json(delivery);
  } catch (err: any) {
    console.error("Update delivery error:", err);
    return res.status(500).json({
      error: err.message || "An error occurred",
    });
  }
};

export const handleDeleteDelivery: RequestHandler = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: "Delivery ID is required",
      });
    }

    const supabase = getSupabaseClient();

    const { error } = await supabase.from("deliveries").delete().eq("id", id);

    if (error) {
      return res.status(500).json({
        error: `Failed to delete delivery: ${error.message}`,
      });
    }

    return res.json({
      success: true,
      message: "Delivery deleted successfully",
    });
  } catch (err: any) {
    console.error("Delete delivery error:", err);
    return res.status(500).json({
      error: err.message || "An error occurred",
    });
  }
};
