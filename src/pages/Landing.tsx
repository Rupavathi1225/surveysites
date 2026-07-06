import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen bg-gray-100 text-gray-900 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-100/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-icon.png" className="h-8 w-8 object-contain" alt="SurveyForever Logo" />
            <span className="text-lg font-bold">
              <span className="text-gray-900">Survey</span>
              <span className="text-primary">Forever</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#how" className="hover:text-gray-900 transition-colors">How It Works</a>
            <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
            <Link to="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-gray-900 hover:bg-gray-200/50 hover:text-gray-900">
                Sign In
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="gap-1">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              1,000+ Paid Surveys & Offers — Updated Daily
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight text-gray-900">
              Get Paid for{" "}
              <span className="text-gradient">Surveys,</span> App Testing & Rewards.
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-xl">
              Share your opinion, test apps, and complete simple offers to earn real cash
              and gift cards from home. 100% free to join — no experience needed.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/auth">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  Start Earning <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#how">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white text-gray-900 border-gray-300 hover:bg-gray-50 hover:text-gray-900">
                  See How It Works
                </Button>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-600">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-success" /> Safe & Secure</span>
              <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-success" /> 100% Free</span>
              <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-warning" /> Instant Access</span>
            </div>
          </div>

          {/* Hero card */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200/60">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">JL</div>
                <div>
                  <p className="font-semibold leading-tight text-gray-900">Jessica L.</p>
                  <p className="text-xs text-gray-500">Paid Surveys · Florida</p>
                </div>
              </div>
              <span className="rounded-full bg-success/15 text-success text-sm font-semibold px-3 py-1">+$180/mo</span>
            </div>
            <div className="space-y-3">
              {[
                { icon: ClipboardList, t: "Paid Surveys", s: "5–20 min each", v: "$1–$5 each" },
                { icon: Smartphone, t: "App Testing", s: "10–15 min each", v: "$5–$15/test" },
                { icon: Gift, t: "Gift Card Offers", s: "Free to enter", v: "Win $50–$500" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-gray-200/60 bg-gray-50/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-tight text-gray-900">{item.t}</p>
                      <p className="text-xs text-gray-500">{item.s}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-primary">{item.v}</span>
                </div>
              ))}
            </div>
            <Link to="/auth">
              <Button className="w-full mt-5 gap-2" size="lg">
                Unlock Paid Surveys <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
          <div className="grid grid-cols-3 gap-4 border-y border-gray-200/50 py-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center sm:text-left">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs sm:text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-20 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-sm font-semibold tracking-widest text-primary uppercase mb-3">Simple Process</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Three steps to your first payout</h2>
            <p className="mt-4 text-gray-600">No resumes, no interviews — just share your opinion and get rewarded.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step) => (
              <div key={step.no} className="bg-white rounded-2xl p-8 text-center border border-gray-200/60 shadow-sm">
                <div className="mx-auto h-14 w-14 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground text-lg font-bold mb-5">
                  {step.no}
                </div>
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <step.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">{step.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-6 items-end mb-12">
            <div>
              <p className="text-sm font-semibold tracking-widest text-primary uppercase mb-3">Explore Ways to Earn</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Paid surveys, app tests, rewards & more.</h2>
            </div>
            <p className="text-gray-600 lg:text-right">
              New paid surveys and offers added every day — there's always a fresh way to earn on SurveyForever.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-5 flex items-center gap-4 border border-gray-200/60 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30">
                <div className="h-11 w-11 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold leading-tight text-gray-900">{f.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-6 items-end mb-12">
            <div>
              <p className="text-sm font-semibold tracking-widest text-primary uppercase mb-3">Real Stories</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Real people earning with their opinion</h2>
            </div>
            <p className="text-gray-600 lg:text-right">15,000+ members are already earning with SurveyForever.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className={`rounded-2xl p-6 border ${
                  t.featured
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-white border-gray-200/60"
                }`}
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${t.featured ? "fill-primary-foreground text-primary-foreground" : "fill-warning text-warning"}`} />
                  ))}
                </div>
                <p className={`text-sm leading-relaxed ${t.featured ? "text-primary-foreground/90" : "text-gray-600"}`}>"{t.quote}"</p>
                <div className="flex items-center gap-3 mt-6">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${t.featured ? "bg-primary-foreground/20 text-primary-foreground" : "bg-gradient-primary text-primary-foreground"}`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className={`font-semibold text-sm leading-tight ${t.featured ? "text-primary-foreground" : "text-gray-900"}`}>{t.name}</p>
                    <p className={`text-xs ${t.featured ? "text-primary-foreground/80" : "text-gray-500"}`}>{t.loc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold tracking-widest text-primary uppercase mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Frequently asked questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="bg-white rounded-xl border border-gray-200/60 px-5 shadow-sm">
                <AccordionTrigger className="text-left font-medium text-gray-900 hover:no-underline">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-gray-600">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20 px-4 sm:px-6 bg-gray-100">
        <div className="max-w-7xl mx-auto rounded-3xl bg-primary p-10 sm:p-14 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground">Get paid for what you think.</h2>
            <p className="mt-4 text-primary-foreground/90 max-w-lg">
              Join 15,000+ members who take paid surveys, test apps, and earn real rewards in their spare time.
            </p>
          </div>
          <div className="lg:text-right">
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="gap-2">
                Start Earning Now <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <p className="mt-3 text-sm text-primary-foreground/80">No credit card · No commitment</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200/50 py-12 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-icon.png" className="h-7 w-7 object-contain" alt="SurveyForever Logo" />
            <span className="text-base font-bold">
              <span className="text-gray-900">Survey</span>
              <span className="text-primary">Forever</span>
            </span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
            <Link to="/auth" className="hover:text-gray-900 transition-colors">Sign In</Link>
            <Link to="/auth" className="hover:text-gray-900 transition-colors">Get Started</Link>
            <Link to="/terms" className="hover:text-gray-900 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-gray-900 transition-colors">Terms & Conditions</Link>
          </nav>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 pt-6 border-t border-gray-200/50">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} SurveyForever. All rights reserved. Complete surveys and offers to earn real rewards online.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
