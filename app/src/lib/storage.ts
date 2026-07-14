/**
 * Supabase Storage helpers for asset uploads
 *
 * Replaces local filesystem writes (which fail on Vercel's read-only /var/task)
 * with uploads to Supabase Storage bucket "app-assets"
 */

import { createRouteClient } from './supabase';

/**
 * Upload an asset to Supabase Storage
 *
 * @param buffer - File content as Buffer
 * @param folder - Folder within bucket (e.g. "brand-assets", "competitor-ads")
 * @param filename - Filename to save as
 * @param contentType - MIME type (e.g. "image/png", "image/jpeg")
 * @returns Public URL of uploaded asset, or null on error
 */
export async function saveAsset(
  buffer: Buffer,
  folder: string,
  filename: string,
  contentType: string
): Promise<string | null> {
  try {
    const supabase = await createRouteClient();
    const path = `${folder}/${filename}`;

    // Upload to public bucket "app-assets"
    const { data, error } = await supabase.storage
      .from('app-assets')
      .upload(path, buffer, {
        contentType,
        upsert: true, // Overwrite if exists
      });

    if (error) {
      console.error(`[storage] Failed to upload ${path}:`, error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('app-assets')
      .getPublicUrl(path);

    return urlData.publicUrl;
  } catch (err) {
    console.error(`[storage] Exception uploading ${folder}/${filename}:`, err);
    return null;
  }
}
