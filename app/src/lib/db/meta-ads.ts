import { createClient } from "@/lib/supabase/client";
import { MetaAdEntry } from "@/lib/types";

export async function getMetaAds(userId: string, brandContextId: string): Promise<MetaAdEntry[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("meta_ads")
    .select("*")
    .eq("user_id", userId)
    .eq("brand_context_id", brandContextId)
    .order("days_running", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    advertiser: row.advertiser,
    headline: row.headline || "",
    primaryText: row.primary_text || "",
    description: row.description || "",
    ctaText: row.cta_text || "",
    imageUrl: row.image_url || "",
    videoUrl: row.video_url || "",
    localImagePath: row.local_image_path || "",
    linkUrl: row.link_url || "",
    platforms: row.platforms || "",
    startDate: row.start_date || "",
    isActive: row.is_active || false,
    daysRunning: row.days_running || 0,
    scrapedAt: row.created_at || "",
  }));
}

export async function saveMetaAds(userId: string, brandContextId: string, ads: MetaAdEntry[]): Promise<void> {
  const supabase = createClient();

  if (ads.length === 0) return;

  // Get search result id for this brand context
  const { data: searchResult } = await supabase
    .from("search_results")
    .select("id")
    .eq("user_id", userId)
    .eq("brand_context_id", brandContextId)
    .order("searched_at", { ascending: false })
    .limit(1)
    .single();

  // Delete existing ads for this brand context
  await supabase
    .from("meta_ads")
    .delete()
    .eq("user_id", userId)
    .eq("brand_context_id", brandContextId);

  // Insert new ads
  const { error } = await supabase
    .from("meta_ads")
    .insert(
      ads.map((ad) => ({
        id: ad.id,
        search_result_id: searchResult?.id || null,
        brand_context_id: brandContextId,
        user_id: userId,
        advertiser: ad.advertiser,
        headline: ad.headline || "",
        primary_text: ad.primaryText || "",
        description: ad.description || "",
        cta_text: ad.ctaText || "",
        image_url: ad.imageUrl || "",
        video_url: ad.videoUrl || "",
        local_image_path: ad.localImagePath || "",
        link_url: ad.linkUrl || "",
        platforms: ad.platforms || "",
        start_date: ad.startDate || "",
        is_active: ad.isActive || false,
        days_running: ad.daysRunning || 0,
      }))
    );

  if (error) throw error;
}

export async function deleteMetaAds(userId: string, brandContextId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("meta_ads")
    .delete()
    .eq("user_id", userId)
    .eq("brand_context_id", brandContextId);

  if (error) throw error;
}
