import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import AuthModal from "@/components/AuthModal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  ClipboardList,
  Smartphone,
  Gift,
  Star,
  ShieldCheck,
  Zap,
  Wallet,
  Trophy,
  Users,
  BadgeCheck,
  CreditCard,
  Target,
  Rocket,
} from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "signup">("login");

  const openAuth = (tab: "login" | "signup") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/dashboard", { replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const stats = [
    { value: "15K+", label: "Active Members" },
    { value: "$4.00/survey", label: "Avg. Survey Reward" },
    { value: "4.9★", label: "Member Rating" },
  ];

  const steps = [
    {
      no: "01",
      icon: Target,
      title: "Create Your Free Account",
      desc: "Sign up in under a minute with just your email. No credit card, no commitments, no fine print.",
    },
    {
      no: "02",
      icon: ClipboardList,
      title: "Complete Surveys & Offers",
      desc: "Pick from paid surveys, app tests, and offer walls that match your interests and start earning points.",
    },
    {
      no: "03",
      icon: Rocket,
      title: "Cash Out Your Rewards",
      desc: "Redeem your points for real cash and gift cards through fast, secure withdrawals.",
    },
  ];

  const features = [
    { icon: ClipboardList, title: "Paid Surveys", sub: "320+ available" },
    { icon: Smartphone, title: "App Testing", sub: "180+ available" },
    { icon: Star, title: "Offer Walls", sub: "240+ available" },
    { icon: Gift, title: "Gift Card Rewards", sub: "150+ available" },
    { icon: CreditCard, title: "Instant Payouts", sub: "Multiple methods" },
    { icon: Trophy, title: "Contests & Prizes", sub: "Weekly draws" },
    { icon: Users, title: "Referral Program", sub: "Earn together" },
    { icon: Wallet, title: "Daily Earnings", sub: "New tasks daily" },
  ];

  const testimonials = [
    {
      quote:
        "I make an extra $180 a month just completing surveys in my spare time. Payouts hit my account fast every single time.",
      name: "Maria R.",
      loc: "Florida, USA",
      initials: "MR",
    },
    {
      quote:
        "I thought earning sites were a scam until I cashed out $50 my first week with SurveyForever. Now I check for new offers daily.",
      name: "Tanya K.",
      loc: "Ohio, USA",
      initials: "TK",
      featured: true,
    },
    {
      quote:
        "The tasks are quick and genuinely fun. I do them during my commute and earn an extra $100–$150 a month easily.",
      name: "Devon J.",
      loc: "Texas, USA",
      initials: "DJ",
    },
  ];

  const faqs = [
    {
      q: "Is SurveyForever really free to join?",
      a: "Yes. Creating an account is 100% free. You'll never be asked to pay anything to earn rewards on our platform.",
    },
    {
      q: "How do I get paid?",
      a: "You earn points for completing surveys and offers, then redeem them for real cash or gift cards through our secure withdrawal options.",
    },
    {
      q: "How much can I earn?",
      a: "Earnings vary by activity, but many active members earn $100–$200+ per month by completing surveys, offers, and app tests regularly.",
    },
    {
      q: "How long does it take to cash out?",
      a: "Once you reach the minimum threshold, withdrawals are processed quickly through your chosen payment method.",
    },
    {
      q: "Do I need any experience?",
      a: "None at all. If you can answer questions and share your opinion, you can start earning right away.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-icon.png" className="h-8 w-8 object-contain" alt="SurveyForever Logo" />
            <span className="text-lg font-bold tracking-tight">
              <span className="text-gray-900">Survey</span>
              <span className="text-primary font-extrabold">Forever</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-600">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#how" className="hover:text-primary transition-colors">How It Works</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => openAuth("login")} className="hidden sm:inline-flex text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded font-semibold">
              Sign In
            </Button>
            <Button size="sm" onClick={() => openAuth("signup")} className="gap-1 rounded bg-primary hover:bg-primary/95 text-white font-semibold px-4">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-white pt-12 pb-16">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-12 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 border border-emerald-200/80 bg-emerald-50/60 px-3 py-1 rounded text-xs font-semibold text-emerald-800 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00b368] animate-pulse" />
              1,000+ Paid Surveys & Offers — Updated Daily
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight text-gray-900">
              Get Paid for{" "}
              <span className="text-primary font-black">Surveys</span>, App Testing & Rewards.
            </h1>
            <p className="mt-6 text-base text-gray-600 max-w-xl leading-relaxed">
              Share your opinion, test apps, and complete simple offers to earn real cash
              and gift cards from home. 100% free to join — no experience needed.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={() => openAuth("signup")} className="w-full sm:w-auto gap-2 rounded bg-primary hover:bg-primary/95 text-white px-8 font-semibold">
                Start Earning <ArrowRight className="h-4 w-4" />
              </Button>
              <a href="#how">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900 rounded px-8 font-semibold">
                  See How It Works
                </Button>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-gray-500">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Safe & Secure</span>
              <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-primary" /> 100% Free</span>
              <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-amber-500" /> Instant Access</span>
            </div>
          </div>

          {/* Hero mockup illustration */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-lg">
              {/* Decorative background gradients for depth */}
              <div className="absolute -top-8 -left-8 w-72 h-72 bg-emerald-50 rounded-full filter blur-3xl opacity-75 -z-10" />
              <div className="absolute -bottom-8 -right-8 w-72 h-72 bg-slate-50 rounded-full filter blur-3xl opacity-75 -z-10" />
              
              <img 
                src="/survey_hero_mockup.png" 
                alt="Survey Platform Mockup" 
                className="w-full h-auto object-contain rounded-lg border border-gray-200/80 shadow-md"
              />
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
          <div className="grid grid-cols-3 gap-4 border-y border-gray-200/80 py-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center sm:text-left">
                <p className="text-2xl sm:text-3xl font-extrabold text-gray-950">{s.value}</p>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-20 bg-gray-50/50 border-y border-gray-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-bold tracking-widest text-primary uppercase mb-3">Simple Process</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Three steps to your first payout</h2>
            <p className="mt-4 text-sm text-gray-600 leading-relaxed">No resumes, no interviews — just share your opinion and get rewarded.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.no} className="bg-white rounded-lg p-8 text-center border border-gray-200/60 relative shadow-sm">
                <span className="absolute top-4 right-6 text-4xl font-black text-gray-100">{step.no}</span>
                <div className="mx-auto h-12 w-12 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#00b368] mb-6">
                  <step.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold mb-3 text-gray-900">{step.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-6 items-end mb-12">
            <div>
              <p className="text-xs font-bold tracking-widest text-primary uppercase mb-3">Explore Ways to Earn</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Paid surveys, app tests, rewards & more.</h2>
            </div>
            <p className="text-sm text-gray-600 lg:text-right leading-relaxed max-w-lg ml-auto">
              New paid surveys and offers added every day — there's always a fresh way to earn on SurveyForever.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-lg p-5 flex items-center gap-4 border border-gray-200/80 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/50">
                <div className="h-11 w-11 shrink-0 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-center text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm leading-tight text-gray-900">{f.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50/50 border-y border-gray-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-6 items-end mb-12">
            <div>
              <p className="text-xs font-bold tracking-widest text-primary uppercase mb-3">Real Stories</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Real people earning with their opinion</h2>
            </div>
            <p className="text-sm text-gray-600 lg:text-right">15,000+ members are already earning with SurveyForever.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className={`rounded-lg p-6 border ${
                  t.featured
                    ? "bg-emerald-50/60 border-emerald-300/80"
                    : "bg-white border-gray-200"
                } shadow-sm`}
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-gray-700">"{t.quote}"</p>
                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
                  <div className="h-8 w-8 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-800">
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-gray-900">{t.name}</p>
                    <p className="text-[10px] text-gray-500">{t.loc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold tracking-widest text-primary uppercase mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Frequently asked questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="bg-white rounded-lg border border-gray-200 px-5 shadow-sm">
                <AccordionTrigger className="text-left font-bold text-sm text-gray-900 hover:no-underline">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-gray-600 leading-relaxed">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto rounded-lg bg-[#0B3B24] p-10 sm:p-14 grid lg:grid-cols-2 gap-8 items-center border border-[#09301D] shadow-lg">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">Get paid for what you think.</h2>
            <p className="mt-4 text-sm text-emerald-100/90 max-w-lg leading-relaxed">
              Join 15,000+ members who take paid surveys, test apps, and earn real rewards in their spare time.
            </p>
          </div>
          <div className="lg:text-right">
            <Button size="lg" onClick={() => openAuth("signup")} className="gap-2 rounded bg-white hover:bg-gray-100 text-[#0B3B24] px-8 font-semibold">
              Start Earning Now <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="mt-3 text-xs text-emerald-200/80">No credit card · No commitment</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-icon.png" className="h-7 w-7 object-contain" alt="SurveyForever Logo" />
            <span className="text-base font-bold tracking-tight">
              <span className="text-gray-900">Survey</span>
              <span className="text-primary">Forever</span>
            </span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-gray-500">
            <button onClick={() => openAuth("login")} className="hover:text-primary transition-colors">Sign In</button>
            <button onClick={() => openAuth("signup")} className="hover:text-primary transition-colors">Get Started</button>
            <Link to="/terms" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
          </nav>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 pt-6 border-t border-gray-200">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            © {new Date().getFullYear()} SurveyForever. All rights reserved. Complete surveys and offers to earn real rewards online.
          </p>
        </div>
      </footer>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultTab={authTab} />
    </div>
  );
};

export default Landing;
