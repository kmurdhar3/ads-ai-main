"use client";

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";

const plans = [
  {
    name: "Trial",
    price: "$0",
    period: "forever",
    description: "Try it out and see if it works for you",
    credits: "10 concepts/month",
    features: [
      "Brand context collection",
      "Competitor search & analysis",
      "AI-generated ad concepts",
      "Quality-scored output",
      "Single brand",
    ],
  },
  {
    name: "Starter",
    price: "$49",
    period: "per month",
    description: "Perfect for solo creators and small businesses",
    credits: "100 concepts/month",
    features: [
      "Everything in Trial",
      "Priority generation",
      "Advanced analytics",
      "Email support",
      "Up to 3 brands",
    ],
    recommended: true,
  },
  {
    name: "Pro",
    price: "$149",
    period: "per month",
    description: "Built for agencies managing multiple clients",
    credits: "500 concepts/month",
    features: [
      "Everything in Starter",
      "Unlimited brands",
      "White-label exports",
      "Priority support",
      "Custom integrations",
    ],
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();

  const handleChoosePlan = (planName: string) => {
    if (!user) {
      // Not logged in - route to signup with plan intent
      router.push(`/signup?plan=${planName.toLowerCase()}`);
    } else {
      // TODO: Call checkout endpoint when billing is set up
      // For now, show a message
      alert(`Billing system coming soon. You selected: ${planName}`);
    }
  };

  return (
    <div className="flex-1">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free and scale as you grow. All plans include access to proven competitor insights and AI-generated concepts.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 ${
                plan.recommended
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-white/[0.08] bg-white/[0.02]"
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                    Recommended
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {plan.description}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/ {plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {plan.credits}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Button
                onClick={() => handleChoosePlan(plan.name)}
                variant={plan.recommended ? "default" : "outline"}
                className="w-full"
                size="lg"
              >
                {plan.name === "Trial" ? "Start Free" : "Choose Plan"}
              </Button>
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            Billing system integration coming soon. All features are currently available in Trial mode.
          </p>
        </div>
      </div>
    </div>
  );
}
