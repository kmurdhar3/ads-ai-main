import { createClient } from "@/lib/supabase/client";
import { Product } from "@/lib/types";

export async function getProducts(userId: string): Promise<Product[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", userId)
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

export async function saveProducts(userId: string, products: Product[]): Promise<void> {
  const supabase = createClient();

  // Get brand context id
  const { data: brandContext } = await supabase
    .from("brand_contexts")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!brandContext) {
    throw new Error("Brand context not found. Create brand context first.");
  }

  // Delete existing products
  await supabase
    .from("products")
    .delete()
    .eq("user_id", userId);

  if (products.length === 0) return;

  // Insert new products
  const { error } = await supabase
    .from("products")
    .insert(
      products.map((p) => ({
        brand_context_id: brandContext.id,
        user_id: userId,
        name: p.name,
        description: p.description || "",
        price: p.price || "",
        category: p.category || "",
      }))
    );

  if (error) throw error;
}

export async function addProduct(userId: string, product: Product): Promise<void> {
  const supabase = createClient();

  const { data: brandContext } = await supabase
    .from("brand_contexts")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!brandContext) {
    throw new Error("Brand context not found. Create brand context first.");
  }

  const { error } = await supabase
    .from("products")
    .insert({
      brand_context_id: brandContext.id,
      user_id: userId,
      name: product.name,
      description: product.description || "",
      price: product.price || "",
      category: product.category || "",
    });

  if (error) throw error;
}
