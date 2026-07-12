import { Building2, Search, TrendingUp, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: 1,
    icon: Building2,
    title: "Brand Context",
    subtitle: "We learn your brand from your website, Instagram, and YouTube",
    details: [
      "Paste your website URL and we'll crawl up to 15 pages to understand your brand identity, tone, and product catalog",
      "Connect your Instagram to pull profile info, recent posts, and visual style",
      "Optionally add your YouTube channel for deeper content analysis of your messaging and target audience",
      "Our AI analyzes all this data to build a complete brand profile: colors, visual style, category, tone, and key themes",
      "We download and store your brand assets locally so we have reference visuals for ad generation",
    ],
  },
  {
    number: 2,
    icon: Search,
    title: "Find Competitors",
    subtitle: "We search the Meta Ad Library for advertisers actually spending in your niche",
    details: [
      "We extract relevant keywords from your brand context and let you edit them to target the right niche",
      "Each keyword searches the Meta Ad Library — Facebook's public database of all active ads",
      "We process keywords in parallel batches of 3 to give you results fast (typically 10-30 seconds per batch)",
      "For each ad, we download the image/video thumbnail locally so they don't expire",
      "We score advertisers by performance signals: how long their ads have been running (30+ days = working), how many active ads they're running, and other engagement indicators",
      "Ads are grouped by advertiser and ranked so you see the top performers first",
    ],
  },
  {
    number: 3,
    icon: TrendingUp,
    title: "What's Working",
    subtitle: "Claude AI extracts the exact hooks, angles, and patterns behind their best ads",
    details: [
      "We send the top 25 competitor ads (sorted by days running) to Claude AI for deep analysis",
      "Claude extracts the exact hook from each ad: the opening line, the technique used (curiosity gap, social proof, urgency, etc.), and why it works psychologically",
      "For video ads, we analyze the first 3-5 seconds — the critical window before most viewers scroll",
      "Claude identifies 5-8 winning patterns across all the ads: common hook types, copy structures, emotional angles, offer types, and visual approaches",
      "Each pattern includes specific examples with clickable thumbnails so you can see the actual ads",
      "These insights become the foundation for your ad concepts — we're not guessing, we're replicating what's already proven to work",
    ],
  },
  {
    number: 4,
    icon: Sparkles,
    title: "Create Ads",
    subtitle: "Get new ad copy + AI-generated images built on those proven strategies for your products",
    details: [
      "We dynamically pair top competitor ads with your brand's products — you choose how many concepts to generate (1-30)",
      "For each concept, we detect the reference ad's format: video ads get a scene-by-scene script + key frame image, static ads get a single image",
      "The AI writes ad copy using the competitor's hook structure and messaging angles, but for YOUR product (explicit product-first prompting ensures we don't copy their product claims)",
      "We generate images using Kie.ai's Nano Banana Pro model, using the competitor ad as a reference for composition and aspect ratio (9:16 for Stories, 4:5 for Feed, 1:1 for Square)",
      "Every concept runs through quality control scoring (brand consistency 40%, copy quality 35%, strategic relevance 25%) — only concepts that score 6.0/10 or higher are shown to you",
      "Failed concepts get one retry with QC feedback injected into the prompt to improve quality",
      "We process 3 concepts in parallel and stream them to you as they complete, with time estimates so you know how long the full batch will take",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <div className="flex-1">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            How It Works
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A transparent look at our 4-step pipeline for finding what works and creating ads that convert.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-20">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-8 top-20 bottom-0 w-px bg-gradient-to-b from-primary/40 to-transparent" />
              )}

              {/* Step Content */}
              <div className="flex gap-6">
                {/* Icon */}
                <div className="relative flex-shrink-0">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border-2 border-primary/20">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                </div>

                {/* Text */}
                <div className="flex-1 pt-1">
                  <div className="mb-2 text-sm font-semibold text-primary">
                    Step {step.number}
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
                  <p className="text-muted-foreground mb-6">{step.subtitle}</p>

                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
                    <ul className="space-y-4">
                      {step.details.map((detail, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {i + 1}
                          </span>
                          <span className="text-sm text-muted-foreground leading-relaxed pt-0.5">
                            {detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-20 pt-12 border-t border-white/[0.06]">
          <h2 className="text-2xl font-bold mb-4">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground mb-6">
            Create your first ad concepts in minutes.
          </p>
          <Link href="/signup">
            <Button size="lg" className="text-base px-8">
              Start Free
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
