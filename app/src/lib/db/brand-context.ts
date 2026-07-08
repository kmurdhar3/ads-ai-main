import { createClient } from "@/lib/supabase/client";
import { BrandContext } from "@/lib/types";

export async function getBrandContext(userId: string): Promise<BrandContext | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("brand_contexts")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // No rows found
    throw error;
  }

  return data.raw_data as BrandContext;
}

export async function saveBrandContext(userId: string, context: BrandContext): Promise<void> {
  const supabase = createClient();

  // Check if user already has a brand context
  const { data: existing } = await supabase
    .from("brand_contexts")
    .select("id")
    .eq("user_id", userId)
    .single();

  const contextData = {
    user_id: userId,
    name: context.name,
    description: context.description || "",
    url: context.url || null,
    instagram_handle: context.instagramHandle || null,
    keywords: context.keywords || [],
    visual_analysis: context.visualAnalysis || null,
    raw_data: context,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from("brand_contexts")
      .update(contextData)
      .eq("id", existing.id);

    if (error) throw error;
  } else {
    // Insert new
    const { error } = await supabase
      .from("brand_contexts")
      .insert(contextData);

    if (error) throw error;
  }
}

export async function deleteBrandContext(userId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("brand_contexts")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
}
