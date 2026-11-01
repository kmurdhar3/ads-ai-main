// Server-side client: it carries the user's session cookie, so RLS allows the queries.
import { createClient } from "@/lib/supabase/server";
import { MetaAdEntry } from "@/lib/types";

export async function getMetaAds(userId: string, brandContextId: string): Promise<MetaAdEntry[]> {
  const supabase = await createClient();

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

export async function saveMetaAds(
  userId: string,
  brandContextId: string,
  ads: MetaAdEntry[],
  searchResultId: string | null = null
): Promise<void> {
  const supabase = await createClient();

  if (ads.length === 0) return;

  // The same ad can come back for several keywords; id is the primary key.
  const seen = new Set<string>();
  const uniqueAds = ads.filter((ad) => {
    if (seen.has(ad.id)) return false;
    seen.add(ad.id);
    return true;
  });

  // Replace existing ads for this brand context
  const { error: deleteError } = await supabase
    .from("meta_ads")
    .delete()
    .eq("user_id", userId)
    .eq("brand_context_id", brandContextId);
  if (deleteError) throw new Error(`Delete old ads failed: ${deleteError.message}`);

  const { error } = await supabase
    .from("meta_ads")
    .insert(
      uniqueAds.map((ad) => ({
        id: ad.id,
        search_result_id: searchResultId,
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

  if (error) throw new Error(`Save ads failed: ${error.message}`);
}

export async function deleteMetaAds(userId: string, brandContextId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("meta_ads")
    .delete()
    .eq("user_id", userId)
    .eq("brand_context_id", brandContextId);

  if (error) throw error;
}
