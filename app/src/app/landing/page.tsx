import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingHome } from "@/components/marketing/home";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black">
      <MarketingNav />
      <MarketingHome />
      <MarketingFooter />
    </div>
  );
}