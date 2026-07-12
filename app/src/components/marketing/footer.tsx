import Link from "next/link";
import Image from "next/image";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/[0.06] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg overflow-hidden">
            <Image
              src="/logo_2.png"
              alt="AdLaunch AI Logo"
              width={28}
              height={28}
              unoptimized
              className="h-full w-full object-cover"
            />
          </div>
          <span className="text-[13px] font-medium text-white">AdLaunch AI</span>
        </div>

        <div className="flex items-center gap-6">
          <Link
            href="/pricing"
            className="text-[12px] text-muted-foreground transition-colors hover:text-white"
          >
            Pricing
          </Link>
          <Link
            href="/how-it-works"
            className="text-[12px] text-muted-foreground transition-colors hover:text-white"
          >
            How it Works
          </Link>
          <Link
            href="/knowledge"
            className="text-[12px] text-muted-foreground transition-colors hover:text-white"
          >
            Knowledge Base
          </Link>
        </div>

        <p className="text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} AdLaunch AI. Powered by Claude + Meta Ad Library.
        </p>
      </div>
    </footer>
  );
}