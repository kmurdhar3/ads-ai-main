# Collect Brand Context

Guide the user through collecting brand context from whatever inputs they provide.

## Instructions

Ask the user what they have available:
- A website URL
- An Instagram handle
- Keywords or a product category (e.g., "wireless charging accessories")
- Files (product catalogs, brand guides, images)
- A text description of their brand

Then collect context step by step:

### 1. Website (if URL provided)
- Use the existing brand scraping endpoint: `POST /api/brand` with `{ websiteUrl, instagramHandle }`
- This crawls the site, extracts products, downloads visuals, and analyzes brand identity
- Wait for the SSE stream to complete

### 2. Instagram (if handle provided)
- The brand endpoint handles Instagram scraping automatically when a handle is passed

### 3. Files (if provided)
- Read any files the user provides (images, PDFs, text files)
- For images: save to `data/brand-assets/` with `asset-` prefix
- Analyze images with Gemini vision if available

### 4. Keywords / Description
- If the user provides keywords or a description instead of a URL, build the brand context manually
- Use Claude to synthesize a brand identity from the description

### 5. Visual Analysis (optional)
- If brand assets exist in `data/brand-assets/`, run Gemini vision analysis
- Call `analyzeBrandVisuals()` from `gemini.ts` with the image paths
- This produces a unified visual brand identity description

### 6. Save Brand Context
- Build a `BrandContext` JSON object with all collected information
- Save via `PUT /api/brand-context` endpoint
- Confirm what was collected and display a summary

### 7. Summary
Show the user:
- Brand name and description
- Number of products extracted
- Number of visual assets collected
- Visual analysis summary (if available)
- Keywords for competitor search
- Link to view results: http://localhost:3000/brand

## Example Flow

```
User: "My brand is called FreshBrew, we sell organic mushroom coffee at freshbrew.co, Instagram is @freshbrewco"

Claude: I'll collect your brand context now.
1. Crawling freshbrew.co...
2. Scraping @freshbrewco on Instagram...
3. Analyzing brand identity...
4. Extracting products...
5. Downloading visual assets...

Done! Here's your brand profile:
- Name: FreshBrew
- Products: 4 products (Lion's Mane Blend, Chaga Mocha, etc.)
- Visuals: 22 assets (15 website, 7 Instagram)
- Keywords: ["mushroom coffee", "organic coffee", "functional beverages"]

View at: http://localhost:3000/brand
Next step: Open http://localhost:3000/competitors to find competitor ads.
```
