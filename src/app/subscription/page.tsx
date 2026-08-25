import Link from "next/link";
import { Crown, ArrowLeft, Sparkles } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "10 searches per day",
      "Cross-medium recommendations",
      "Save favorites",
    ],
    bgClass: "bg-[#D2E9F9]",
    current: true,
  },
  {
    name: "Pro",
    price: "$9",
    period: "/month",
    features: [
      "Unlimited searches",
      "AI-powered match reasons",
      "Priority ranking",
      "Advanced mood mapping",
      "Early access to new features",
    ],
    bgClass: "bg-[#FFEAA7]",
    current: false,
  },
];

export default function SubscriptionPage() {
  return (
    <section className="relative overflow-hidden min-h-screen px-4 sm:px-8 py-10 lg:py-16 bg-[#FAF6EE]">
      <div className="absolute top-12 left-10 text-[#1a1a15] opacity-10 hidden xl:block select-none pointer-events-none">
        <svg width="72" height="72" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.8 9.2L24 12L14.8 14.8L12 24L9.2 14.8L0 12L9.2 9.2Z" />
        </svg>
      </div>

      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="relative border-2 border-[#1a1a15] p-8 sm:p-10 rounded-2xl bg-white shadow-[8px_8px_0px_#1a1a15] mb-10">
          <span className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#FFEAA7] border border-[#1a1a15]" />
          <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#FFEAA7] border border-[#1a1a15]" />
          <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[#FFEAA7] border border-[#1a1a15]" />
          <span className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#FFEAA7] border border-[#1a1a15]" />

          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 bg-[#D2E9F9] border-2 border-[#1a1a15] px-4 py-2 rounded-xl shadow-[3px_3px_0px_#1a1a15]">
              <Crown className="h-5 w-5 text-[#4F46E5]" />
              <span className="text-xs font-black uppercase tracking-widest text-[#1a1a15]">
                Crossy Pro
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#1a1a15] leading-[1.1]">
              Coming Soon
            </h1>

            <p className="text-lg text-[#1a1a15]/70 font-medium max-w-md mx-auto">
              We&apos;re building something special. Unlock the full power of
              cross-medium discovery with Pro.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative border-2 border-[#1a1a15] p-6 sm:p-8 rounded-2xl ${plan.bgClass} shadow-[6px_6px_0px_#1a1a15]`}
            >
              <span className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-white border border-[#1a1a15]" />
              <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-white border border-[#1a1a15]" />
              <span className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-white border border-[#1a1a15]" />
              <span className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-white border border-[#1a1a15]" />

              <div className="flex items-baseline gap-2 mb-6">
                <h2 className="text-xl font-black text-[#1a1a15] uppercase tracking-wider">
                  {plan.name}
                </h2>
                {plan.current && (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-[#1a1a15] text-white px-2 py-0.5 rounded-md">
                    Current
                  </span>
                )}
              </div>

              <div className="mb-6">
                <span className="text-4xl font-black text-[#1a1a15]">
                  {plan.price}
                </span>
                <span className="text-sm font-bold text-[#1a1a15]/60 ml-1">
                  {plan.period}
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3 text-sm font-medium text-[#1a1a15]"
                  >
                    <Sparkles className="h-4 w-4 shrink-0 text-[#4F46E5]" />
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.current ? (
                <div className="w-full py-3 px-4 text-sm font-bold text-[#1a1a15]/50 bg-white/60 rounded-xl border-2 border-[#1a1a15]/20 text-center">
                  Your current plan
                </div>
              ) : (
                <div className="w-full py-3 px-4 text-sm font-bold text-white bg-[#1a1a15] rounded-xl border-2 border-[#1a1a15] text-center shadow-[3px_3px_0px_rgba(26,26,21,0.5)] cursor-not-allowed opacity-70">
                  Coming Soon
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm font-medium text-[#1a1a15]/50">
            Have questions? Reach out at{" "}
            <a
              href="mailto:support@crossy.app"
              className="font-bold text-[#4F46E5] underline underline-offset-4 hover:text-[#1a1a15] transition-colors"
            >
              support@crossy.app
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
