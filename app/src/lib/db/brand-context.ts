import { createRouteClient } from "@/lib/supabase/route";
import { BrandContext } from "@/lib/types";

export async function listBrandContexts(userId: string) {
  const supabase = await createRouteClient();

  const { data, error } = await supabase
    .from("brand_contexts")
    .select("id, name, url, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function getMostRecentBrandId(userId: string): Promise<string | null> {
  const supabase = await createRouteClient();

  const { data, error } = await supabase
    .from("brand_contexts")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // No rows found
    throw error;
  }

  return data.id;
}

export async function getBrandContext(userId: string, brandContextId: string): Promise<BrandContext | null> {
  const supabase = await createRouteClient();

  const { data, error } = await supabase
    .from("brand_contexts")
    .select("*")
    .eq("user_id", userId)
    .eq("id", brandContextId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // No rows found
    throw error;
  }

  return data.raw_data as BrandContext;
}

export async function saveBrandContext(userId: string, context: BrandContext): Promise<{ brandId: string }> {
  const supabase = await createRouteClient();

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

  // Always insert a new brand context
  const { data, error } = await supabase
    .from("brand_contexts")
    .insert(contextData)
    .select("id")
    .single();

  if (error) throw error;

  return { brandId: data.id };
}

export async function deleteBrandContext(userId: string): Promise<void> {
  const supabase = await createRouteClient();

  const { error } = await supabase
    .from("brand_contexts")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
}
