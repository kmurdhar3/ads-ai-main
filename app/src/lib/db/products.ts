import { createClient } from "@/lib/supabase/client";
import { Product } from "@/lib/types";

export async function getProducts(userId: string, brandContextId: string): Promise<Product[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", userId)
    .eq("brand_context_id", brandContextId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description || "",
    price: row.price || "",
    imageUrl: "",
    category: row.category || "",
  }));
}

export async function saveProducts(userId: string, brandContextId: string, products: Product[]): Promise<void> {
  const supabase = createClient();

  // Delete existing products for this brand context
  await supabase
    .from("products")
    .delete()
    .eq("user_id", userId)
    .eq("brand_context_id", brandContextId);

  if (products.length === 0) return;

  // Insert new products
  const { error } = await supabase
    .from("products")
    .insert(
      products.map((p) => ({
        brand_context_id: brandContextId,
        user_id: userId,
        name: p.name,
        description: p.description || "",
        price: p.price || "",
        category: p.category || "",
      }))
    );

  if (error) throw error;
}

export async function addProduct(userId: string, brandContextId: string, product: Product): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("products")
    .insert({
      brand_context_id: brandContextId,
      user_id: userId,
      name: product.name,
      description: product.description || "",
      price: product.price || "",
      category: product.category || "",
    });

  if (error) throw error;
}
