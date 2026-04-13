import { useState } from "react";
import { Link } from "react-router-dom";
import { useCmsContent } from "@/hooks/useCmsContent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  BarChart2, Package, ShoppingCart, Users, Truck, FileText,
  PieChart, Shield, Layers, CreditCard, Bell, Settings,
  CheckCircle2, Phone, Mail, MapPin, ArrowRight, Lock,
  Star, Zap, Server, Database, RefreshCw, UserCheck, Store,
  TrendingUp, LayoutDashboard, AlertCircle, Receipt, Sparkles,
  Globe, ExternalLink, ChevronRight, Play, Box,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  BarChart2, Package, ShoppingCart, Users, Truck, FileText,
  PieChart, Shield, Layers, CreditCard, Bell, Settings,
};

const DEFAULTS = {
  hero: {
    title: "Simple, Smart & Secure ERP for Tiles and Sanitary Dealers",
    subtitle: "Manage Purchase, Sales, Stock, Credit, Profit & Reports — All in One Cloud System.",
    button_text: "Start Free Trial",
    button_link: "/get-started",
    extra_json: {
      badge: "Trusted by 100+ Dealers",
      secondary_button: "Sign In",
      secondary_link: "/login",
    },
  },
  features: {
    title: "Everything You Need",
    subtitle: "Powerful features built for tiles & sanitary dealers",
    extra_json: {
      items: [
        { icon: "Package", title: "Inventory Management", description: "Track stock levels by box, SFT, and piece. Set reorder alerts and monitor aging inventory in real time." },
        { icon: "ShoppingCart", title: "Sales & Invoicing", description: "Create sales invoices, manage credit limits, process returns and track outstanding dues with ease." },
        { icon: "Truck", title: "Purchase Management", description: "Record supplier purchases, calculate landed costs and maintain complete supplier ledgers." },
        { icon: "BarChart2", title: "Financial Reports", description: "Detailed P&L, cash flow, customer receivables, supplier payables and inventory valuation reports." },
        { icon: "Users", title: "Customer Ledger", description: "Full customer transaction history, credit tracking, overdue alerts and payment collection." },
        { icon: "Shield", title: "Role-Based Access", description: "Owner and salesman roles with granular permissions. Every action is audit-logged for security." },
      ],
    },
  },
  pricing: {
    title: "Simple, Transparent Pricing",
    subtitle: "No hidden fees. Cancel anytime.",
    extra_json: {},
  },
  footer: {
    title: "Tiles & Sanitary ERP",
    description: "The modern ERP platform for tiles and sanitary dealers.",
    extra_json: {
      phone: "+880 1234-567890",
      email: "support@tilesERP.com",
      address: "Dhaka, Bangladesh",
      copyright: `© ${new Date().getFullYear()} Tiles ERP. All rights reserved.`,
    },
  },
};

const SectionSkeleton = () => (
  <div className="space-y-4 py-12 px-4 max-w-4xl mx-auto">
    <Skeleton className="h-10 w-64 mx-auto" />
    <Skeleton className="h-5 w-96 mx-auto" />
    <div className="grid grid-cols-3 gap-4 mt-8">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
    </div>
  </div>
);

/* ─── NAV ─── */
const Navbar = ({ companyName }: { companyName: string }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/25">
            <Layers className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground tracking-tight">{companyName}</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-primary transition-colors">Features</a>
          <a href="#why-us" className="hover:text-primary transition-colors">Why Us</a>
          <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
          <a href="#security" className="hover:text-primary transition-colors">Security</a>
          <a href="#contact" className="hover:text-primary transition-colors">Contact</a>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button size="sm" variant="ghost" className="text-foreground font-medium">Sign In</Button>
          </Link>
          <Link to="/get-started">
            <Button size="sm" className="gap-1.5 shadow-md shadow-primary/20">
              Get Started <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

/* ─── HERO ─── */
const HeroSection = ({ cms }: { cms: typeof DEFAULTS.hero & { extra_json: any } }) => {
  const ex = cms.extra_json ?? {};
  return (
    <section className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32">
      {/* Background pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[80px]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {ex.badge && (
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Star className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-semibold text-primary">{ex.badge}</span>
          </div>
        )}

        <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-foreground leading-[1.1] tracking-tight mb-6">
          {cms.title?.split("ERP").map((part, i, arr) =>
            i < arr.length - 1 ? (
              <span key={i}>{part}<span className="text-primary">ERP</span></span>
            ) : <span key={i}>{part}</span>
          )}
        </h1>

        {cms.subtitle && (
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            {cms.subtitle}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to={cms.button_link || "/get-started"}>
            <Button size="lg" className="gap-2 px-10 h-14 text-base font-semibold shadow-xl shadow-primary/25 rounded-xl">
              {cms.button_text || "Start Free Trial"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          {ex.secondary_button && (
            <Link to={ex.secondary_link || "/login"}>
              <Button size="lg" variant="outline" className="gap-2 px-10 h-14 text-base font-semibold rounded-xl border-2">
                {ex.secondary_button}
              </Button>
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="mt-16 flex flex-wrap justify-center gap-8 sm:gap-16">
          {[
            { value: "100+", label: "Active Dealers", icon: Store },
            { value: "99.9%", label: "Uptime SLA", icon: Zap },
            { value: "24/7", label: "Data Backup", icon: Database },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="text-xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── FEATURES ─── */
const FeaturesSection = ({ cms }: { cms: typeof DEFAULTS.features & { extra_json: any } }) => {
  const items: { icon: string; title: string; description: string }[] = cms.extra_json?.items ?? [];
  return (
    <section id="features" className="py-24 bg-background relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase tracking-wider">
            Features
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4 tracking-tight">{cms.title}</h2>
          {cms.subtitle && <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{cms.subtitle}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item, i) => {
            const Icon = ICON_MAP[item.icon] ?? Package;
            return (
              <div
                key={i}
                className="group relative rounded-2xl border border-border/60 bg-card p-7 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/25 transition-all duration-300">
                  <Icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                </div>
                <h3 className="font-bold text-foreground mb-2 text-lg">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* ─── WHY CHOOSE US ─── */
const WhyChooseUsSection = () => {
  const items = [
    { icon: LayoutDashboard, title: "Owner-Centric Dashboard", description: "Complete business overview — sales, purchases, stock, profit, and dues — on one screen." },
    { icon: Package, title: "Real-Time Stock Control", description: "Track inventory by Box and SFT simultaneously. Know stock before every sale." },
    { icon: AlertCircle, title: "Smart Credit Monitoring", description: "Set credit limits per customer, get overdue alerts automatically." },
    { icon: Receipt, title: "Profit Per Invoice", description: "See net profit on every sale including COGS, discount, and landed costs." },
    { icon: Bell, title: "Daily SMS & Email Summary", description: "Automated daily business summaries so you stay informed offline." },
    { icon: Store, title: "Online Store Ready", description: "Future-proof with built-in catalog and order management capabilities." },
  ];

  return (
    <section id="why-us" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase tracking-wider">
            Why Choose Us
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
            Built for Dealers, Not Just Anyone
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Every feature designed specifically for tiles and sanitary businesses.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item, i) => (
            <div
              key={i}
              className="group rounded-2xl border border-border/60 bg-card p-7 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
            >
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/25 transition-all duration-300">
                <item.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
              </div>
              <h3 className="font-bold text-foreground mb-2 text-lg">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── TRUSTED & SECURE ─── */
const TrustedSecureSection = () => {
  const trustItems = [
    { icon: Server, title: "Enterprise Cloud Hosting", description: "High-performance VPS with 99.9% uptime SLA and global CDN." },
    { icon: Shield, title: "Bank-Level Encryption", description: "AES-256 encryption for all data at rest and in transit." },
    { icon: RefreshCw, title: "Daily Automated Backup", description: "30-day retention with point-in-time recovery." },
    { icon: Database, title: "Isolated Database", description: "Each dealer's data is fully isolated at the database level." },
    { icon: UserCheck, title: "Role-Based Access", description: "Granular permissions with complete audit trail on every action." },
  ];

  return (
    <section id="security" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase tracking-wider">
            Security
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
            Your Data is Safe With Us
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Enterprise-grade security so you can focus on growing your business.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
          {trustItems.slice(0, 3).map((item, i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card p-7 flex flex-col gap-4 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-foreground text-lg">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto lg:max-w-none lg:grid-cols-2 lg:px-[17%]">
          {trustItems.slice(3).map((item, i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card p-7 flex flex-col gap-4 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-foreground text-lg">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Compliance banner */}
        <div className="mt-10 rounded-2xl bg-primary/5 border border-primary/20 px-8 py-7 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground text-lg">Compliance Ready</p>
              <p className="text-sm text-muted-foreground">Complete audit trail — who did what, when, and from where.</p>
            </div>
          </div>
          <Link to="/security">
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5 rounded-xl">
              Learn More <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

/* ─── PRICING ─── */
const PRICING_PLANS = [
  {
    name: "Starter",
    highlighted: false,
    monthlyPrice: 999,
    yearlyPrice: 10000,
    features: ["Up to 2 users", "Inventory management", "Basic reports", "Customer ledger", "Email notifications"],
  },
  {
    name: "Pro",
    highlighted: true,
    monthlyPrice: 1500,
    yearlyPrice: 20000,
    features: ["Up to 5 users", "All Starter features", "Advanced analytics", "Multi-branch ready", "Priority support", "Email notifications", "SMS notifications"],
  },
];

const PricingSection = ({ cms }: { cms: typeof DEFAULTS.pricing & { extra_json: any } }) => {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase tracking-wider">
            Pricing
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4 tracking-tight">{cms.title}</h2>
          {cms.subtitle && <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{cms.subtitle}</p>}
        </div>

        <div className="flex flex-col items-center gap-3 mb-14">
          <div className="inline-flex items-center gap-4 bg-card border border-border rounded-full px-6 py-3 shadow-sm">
            <span className={`text-sm font-semibold transition-colors ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <Switch checked={yearly} onCheckedChange={setYearly} className="data-[state=checked]:bg-primary" />
            <span className={`text-sm font-semibold transition-colors ${yearly ? "text-foreground" : "text-muted-foreground"}`}>Yearly</span>
          </div>
          <div className={`flex items-center gap-2 transition-all duration-300 ${yearly ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"}`}>
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Save 2 months with yearly billing</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch max-w-3xl mx-auto">
          {PRICING_PLANS.map((plan, i) => {
            const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
            const period = yearly ? "/year" : "/month";
            return (
              <div
                key={i}
                className={`relative rounded-2xl border-2 p-8 flex flex-col gap-6 transition-all ${
                  plan.highlighted
                    ? "border-primary bg-primary text-primary-foreground shadow-2xl shadow-primary/20 scale-[1.02]"
                    : "border-border bg-card"
                }`}
              >
                {plan.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-foreground text-primary text-xs px-4 py-1 font-bold shadow-lg">
                    <Zap className="h-3 w-3 mr-1" /> Most Popular
                  </Badge>
                )}
                <div>
                  <p className={`text-sm font-semibold mb-2 ${plan.highlighted ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{plan.name}</p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-sm font-bold">৳</span>
                    <span className="text-5xl font-extrabold leading-none tracking-tight">{price.toLocaleString()}</span>
                    <span className={`text-sm mb-1 ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{period}</span>
                  </div>
                  {yearly ? (
                    <Badge className={`mt-2 text-[10px] px-2 py-0.5 gap-1 ${plan.highlighted ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"}`}>
                      <Sparkles className="h-3 w-3" /> Save 2 months
                    </Badge>
                  ) : (
                    <p className={`text-xs mt-2 ${plan.highlighted ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      Switch to yearly to save 2 months
                    </p>
                  )}
                </div>
                <ul className="space-y-3 flex-1">
                  {plan.features.map((feat, fi) => (
                    <li key={fi} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${plan.highlighted ? "text-primary-foreground/80" : "text-primary"}`} />
                      <span className={plan.highlighted ? "text-primary-foreground/90" : "text-foreground"}>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/get-started">
                  <Button className="w-full h-12 rounded-xl font-semibold text-base" variant={plan.highlighted ? "secondary" : "default"}>
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          <Link to="/pricing" className="underline underline-offset-4 hover:text-primary transition-colors">
            View full pricing details →
          </Link>
        </p>
      </div>
    </section>
  );
};

/* ─── CTA BANNER ─── */
const CtaSection = ({ heroBtn }: { heroBtn: string; heroBtnLink: string }) => (
  <section className="py-24 bg-primary relative overflow-hidden">
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-primary-foreground/5 blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-primary-foreground/5 blur-[80px]" />
    </div>
    <div className="relative max-w-3xl mx-auto px-4 text-center">
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary-foreground mb-5 tracking-tight">
        Ready to modernise your business?
      </h2>
      <p className="text-primary-foreground/70 text-lg mb-10 max-w-xl mx-auto">
        Join hundreds of dealers already using our ERP to grow faster and manage smarter.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link to="/get-started">
          <Button size="lg" variant="secondary" className="gap-2 px-10 h-14 text-base font-semibold rounded-xl shadow-xl">
            {heroBtn || "Start Free Trial"} <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link to="/login">
          <Button size="lg" variant="outline" className="gap-2 px-10 h-14 text-base font-semibold rounded-xl border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
            Sign In
          </Button>
        </Link>
      </div>
    </div>
  </section>
);

/* ─── FOOTER ─── */
const FooterSection = ({ cms }: { cms: typeof DEFAULTS.footer & { extra_json: any } }) => {
  const ex = cms.extra_json ?? {};
  return (
    <footer id="contact" className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/25">
                <Layers className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-foreground">{cms.title}</span>
            </div>
            {cms.description && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">{cms.description}</p>
            )}
          </div>

          {/* Links */}
          <div>
            <p className="font-bold text-sm text-foreground mb-4 uppercase tracking-wider">Company</p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                { label: "Features", href: "#features" },
                { label: "Pricing", href: "#pricing" },
                { label: "Security", href: "#security" },
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms", href: "/terms" },
              ].map(link => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-primary transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="font-bold text-sm text-foreground mb-4 uppercase tracking-wider">Contact</p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {ex.phone && (
                <li className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <a href={`tel:${ex.phone}`} className="hover:text-primary transition-colors">{ex.phone}</a>
                </li>
              )}
              {ex.email && (
                <li className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <a href={`mailto:${ex.email}`} className="hover:text-primary transition-colors">{ex.email}</a>
                </li>
              )}
              {ex.address && (
                <li className="flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span>{ex.address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {ex.copyright || `© ${new Date().getFullYear()} Tiles ERP. All rights reserved.`}
          </p>
          <a
            href="https://digiwebdex.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors group"
          >
            Design & Development by{" "}
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
              digiwebdex.com
            </span>
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>
      </div>
    </footer>
  );
};

/* ─── MAIN LANDING PAGE ─── */
const LandingPage = () => {
  const { data: sections, isLoading } = useCmsContent();

  const hero     = { ...DEFAULTS.hero,     ...(sections?.hero     ?? {}), extra_json: { ...DEFAULTS.hero.extra_json,     ...(sections?.hero?.extra_json     ?? {}) } };
  const features = { ...DEFAULTS.features, ...(sections?.features ?? {}), extra_json: { ...DEFAULTS.features.extra_json, ...(sections?.features?.extra_json ?? {}) } };
  const pricing  = { ...DEFAULTS.pricing,  ...(sections?.pricing  ?? {}), extra_json: { ...DEFAULTS.pricing.extra_json,  ...(sections?.pricing?.extra_json  ?? {}) } };
  const footer   = { ...DEFAULTS.footer,   ...(sections?.footer   ?? {}), extra_json: { ...DEFAULTS.footer.extra_json,   ...(sections?.footer?.extra_json   ?? {}) } };

  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <div className="h-16 border-b border-border" />
      {[1, 2, 3].map(i => <SectionSkeleton key={i} />)}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar companyName={footer.title || "Tiles ERP"} />
      <HeroSection cms={hero} />
      <FeaturesSection cms={features} />
      <WhyChooseUsSection />
      <TrustedSecureSection />
      <PricingSection cms={pricing} />
      <CtaSection heroBtn={hero.button_text || "Start Free Trial"} heroBtnLink={hero.button_link || "/get-started"} />
      <FooterSection cms={footer} />
    </div>
  );
};

export default LandingPage;
