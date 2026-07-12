import Link from "next/link";
import {
  Building2,
  Search,
  TrendingUp,
  Sparkles,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Ruler,
  Users,
} from "lucide-react";

const steps = [
  {
    icon: Building2,
    step: "01",
    title: "Brand Context",
    desc: "We learn your brand from your website, Instagram, and YouTube",
  },
  {
    icon: Search,
    step: "02",
    title: "Find Competitors",
    desc: "We search the Meta Ad Library for advertisers actually spending money in your niche",
  },
  {
    icon: TrendingUp,
    step: "03",
    title: "What's Working",
    desc: "Claude AI extracts the exact hooks, angles, and psychology behind their best-performing ads",
  },
  {
    icon: Sparkles,
    step: "04",
    title: "Create Ads",
    desc: "Get new ad copy + AI-generated images built on those proven strategies, sized to match your reference ad exactly",
  },
];

const features = [
  {
    icon: ShieldCheck,
    title: "Quality control, built in",
    desc: "Every generated concept is scored before you ever see it — brand consistency, copy quality, and strategic relevance. Only concepts that clear the bar make it to your screen.",
  },
  {
    icon: Ruler,
    title: "Sized exactly right",
    desc: "Generated images automatically match your reference ad's exact dimensions — Story, Feed, or Square — ready to run, not something you have to crop and rework.",
  },
  {
    icon: Users,
    title: "Built for agencies",
    desc: "Manage multiple client brands from one account. Each brand's competitors, analysis, and concepts stay fully isolated — switch between clients from a single dropdown.",
  },
  {
    icon: Search,
    title: "Deep hook analysis",
    desc: "Not just \"what's the headline\" — we extract the exact hook technique, the visual approach, and the psychology behind why an ad works, so the strategy transfers.",
  },
];

export function MarketingHome() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.02] px-4 py-1.5 text-[12px] text-muted-foreground">
          Powered by Claude + Meta Ad Library
        </div>
        <h1 className="mb-6 text-4xl font-bold tracking-tight text-white md:text-5xl">
          Stop guessing what ad will work.
          <br />
          <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            Start with what&apos;s already proven.
          </span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          AdLaunch AI finds the Facebook &amp; Instagram ads your competitors are
          already spending money on — the ones running 30+ days, which means
          they&apos;re working — and generates new ad concepts for your brand
          using the same proven hooks and strategies.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/how-it-works"
            className="rounded-xl border border-white/[0.1] bg-white/[0.02] px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-white/[0.05]"
          >
            See How It Works
          </Link>
        </div>
        <p className="mt-4 text-[12px] text-muted-foreground">
          No credit card required — 3 free credits to try the full pipeline
        </p>
      </section>

      {/* The insight */}
      <section className="border-t border-white/[0.06] px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-2xl font-bold text-white">
            Most ad creative is a guess.
          </h2>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            You write copy, design an image, launch it, and wait two weeks to
            find out if it works. Meanwhile, your competitors have already run
            hundreds of ad variations — and the ones still running after 30
            days are the ones that survived. That&apos;s not a guess.
            That&apos;s proof.
            <br />
            <br />
            AdLaunch AI reverse-engineers what&apos;s already working, then
            builds new ads for your products using the same winning patterns —
            hooks, angles, visual style, and structure.
          </p>
        </div>
      </section>

      {/* 4-step pipeline */}
      <section className="border-t border-white/[0.06] px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-2xl font-bold text-white">
            A 4-step pipeline, start to finish
          </h2>
          <div className="grid gap-6 md:grid-cols-4">
            {steps.map((s) => (
              <div
                key={s.step}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600">
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <p className="mb-1 text-[11px] font-medium text-violet-400">
                  Step {s.step}
                </p>
                <h3 className="mb-2 text-[15px] font-semibold text-white">
                  {s.title}
                </h3>
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-1 text-[13px] text-violet-400 hover:text-violet-300"
            >
              See the full walkthrough
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Feature deep-dive */}
      <section className="border-t border-white/[0.06] px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-2xl font-bold text-white">
            What makes it different
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="flex gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05]">
                  <f.icon className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="mb-1.5 text-[14px] font-semibold text-white">
                    {f.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="border-t border-white/[0.06] px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2">
          <div>
            <h3 className="mb-4 text-[16px] font-semibold text-white">
              Built for
            </h3>
            <ul className="space-y-3">
              {[
                "DTC brand owners and Shopify sellers who need ad creative but don't have a design team",
                "Marketing agencies managing multiple client accounts",
                "Solo marketing consultants who need to produce concepts fast",
                "Growth marketers at startups without a big creative team",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="text-[13px] leading-relaxed text-muted-foreground">
                    {t}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-[16px] font-semibold text-white">
              Not a fit if
            </h3>
            <ul className="space-y-3">
              {[
                "You don't have an existing brand/product yet — we need something to scrape and learn from",
                "You're running TV, print, or billboard — this is Meta-specific",
                "You need a fully hands-off, zero-cost tool — this uses real AI generation, so usage has real cost (that's why credits exist)",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-white/30" />
                  <span className="text-[13px] leading-relaxed text-muted-foreground">
                    {t}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-t border-white/[0.06] px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-3 text-2xl font-bold text-white">
            Simple, credit-based pricing
          </h2>
          <p className="mb-10 text-[13px] text-muted-foreground">
            Start free. Upgrade when you need more.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 rounded-xl border border-white/[0.1] bg-white/[0.02] px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-white/[0.05]"
          >
            See full pricing
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-white/[0.06] px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-8 text-3xl font-bold text-white">
            Stop guessing. Start with proof.
          </h2>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-3.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}