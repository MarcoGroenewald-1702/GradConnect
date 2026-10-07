import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Briefcase,
  FileCheckCorner,
  FolderGit2,
  Gauge,
  GraduationCap,
  Menu,
  Search,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const journeySteps = [
  { label: "Graduate", icon: GraduationCap },
  { label: "Skills", icon: Wrench },
  { label: "Verification", icon: BadgeCheck },
  { label: "Mentor", icon: Users },
  { label: "Opportunity", icon: Briefcase },
  { label: "Career", icon: TrendingUp },
];

const navLinks = [
  { label: "Home", href: "#top" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "For Graduates", href: "#for-graduates" },
  { label: "For Employers", href: "#for-employers" },
  { label: "For Mentors", href: "#for-mentors" },
];

const howItWorks = [
  { n: "01", title: "Build Your Profile", body: "Create your professional IT profile, education history, skills and portfolio." },
  { n: "02", title: "Verify Your Skills", body: "Complete assessments or submit project evidence to turn self-declared skills into verified skills." },
  { n: "03", title: "Keep Growing", body: "Complete recommended micro-learning modules and maintain your technical skills." },
  { n: "04", title: "Get Connected", body: "Find mentors and discover opportunities matched to your verified skills." },
];

const features = [
  { icon: BadgeCheck, title: "Verified Skills", body: "Green verification badges that employers can trust, backed by evidence." },
  { icon: FileCheckCorner, title: "Technical Assessments", body: "Timed, auto-graded assessments per skill with instant results." },
  { icon: BookOpen, title: "Micro-Learning", body: "Short modules that keep your technical skills current after graduation." },
  { icon: Users, title: "Industry Mentors", body: "Book sessions with working IT professionals across South Africa." },
  { icon: Briefcase, title: "Opportunity Matching", body: "Jobs, internships, learnerships and projects matched to what you can do." },
  { icon: FolderGit2, title: "Graduate Portfolio", body: "Projects, repositories and certifications in one shareable profile." },
  { icon: Search, title: "Employer Candidate Discovery", body: "Employers search verified skills instead of guessing from CVs." },
  { icon: Gauge, title: "Career Readiness Score", body: "One score covering profile, verified skills and learning activity." },
];

const audiences = [
  {
    id: "for-graduates",
    eyebrow: "For Graduates",
    title: "Prove what you can actually do",
    body: "Turn your qualification into evidence. Verify skills, keep learning between applications and track every opportunity in one place.",
    points: ["Verified skill badges", "Career readiness score", "Matched opportunities", "Mentor guidance"],
    cta: { label: "Create graduate account", to: "/signup" },
  },
  {
    id: "for-employers",
    eyebrow: "For Employers",
    title: "Shortlist on verified skills",
    body: "Search graduates by verified skill, location and availability. Every candidate profile shows assessment evidence and project work.",
    points: ["Candidate discovery", "Verified vs self-declared", "Application pipeline", "Shortlists"],
    cta: { label: "Explore employer view", to: "/login" },
  },
  {
    id: "for-mentors",
    eyebrow: "For Mentors",
    title: "Give an hour, change a career",
    body: "Publish your weekly availability, accept booking requests and track the graduates you have helped.",
    points: ["Weekly availability", "Session requests", "Mentee history", "Contribution record"],
    cta: { label: "Become a mentor", to: "/signup" },
  },
];

function CareerJourneyCard() {
  return (
    <div className="surface-panel p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Your career journey</p>
        <span className="rounded-full border border-success/30 bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
          3 skills verified
        </span>
      </div>
      <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {journeySteps.map((step, i) => (
          <li key={step.label} className="relative rounded-xl border border-border bg-surface p-3">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">0{i + 1}</span>
            <span className="mt-2 flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <step.icon className="size-4.5" aria-hidden />
            </span>
            <p className="mt-2 text-sm font-semibold text-foreground">{step.label}</p>
          </li>
        ))}
      </ol>
      <div className="mt-5 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-foreground">Career readiness</span>
          <span className="font-bold text-action">72 / 100</span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[72%] rounded-full bg-action" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
          <span>Profile 80%</span>
          <span>3 verified skills</span>
          <span>Learning active</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div id="top" className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" aria-label="GradConnect home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-5 lg:flex" aria-label="Primary">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-2 sm:flex">
            <Button variant="ghost" asChild>
              <Link to="/login">Log In</Link>
            </Button>
            <Button variant="action" asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="ml-auto sm:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </Button>
        </div>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-72 p-6">
          <SheetTitle className="sr-only">Menu</SheetTitle>
            <Logo />
            <nav className="mt-6 flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-muted"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-6 flex flex-col gap-2">
              <Button variant="outline" asChild>
                <Link to="/login">Log In</Link>
              </Button>
              <Button variant="action" asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
            </div>
        </SheetContent>
      </Sheet>

      {/* Hero */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
              <BadgeCheck className="size-3.5 text-success" aria-hidden />
              Built for South African IT graduates
            </span>
            <h1 className="mt-5 text-4xl leading-[1.1] font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Turn Your IT Qualification Into Career Momentum.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Build verified skills, keep learning, connect with industry mentors, and discover opportunities matched to
              what you can actually do.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" variant="action" asChild>
                <Link to="/signup">
                  Get Started <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#how-it-works">Explore How It Works</a>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-6">
              {[
                ["4 800+", "Graduates"],
                ["148", "Live opportunities"],
                ["206", "Industry mentors"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="text-xl font-bold text-foreground">{value}</dt>
                  <dd className="text-xs text-muted-foreground">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <CareerJourneyCard />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">How it works</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Four steps from graduation to a career that recognises your skills.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {howItWorks.map((step) => (
            <div key={step.n} className="surface-panel p-6">
              <span className="text-sm font-bold text-action">{step.n}</span>
              <h3 className="mt-3 text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Everything a graduate career needs</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Skills verification, learning, mentorship and opportunities in a single platform.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="surface-panel p-5">
                <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <f.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For graduates / employers / mentors */}
      {audiences.map((a, i) => (
        <section key={a.id} id={a.id} className={i % 2 === 1 ? "border-y border-border bg-surface" : undefined}>
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center">
            <div className={i % 2 === 1 ? "lg:order-2" : undefined}>
              <p className="text-sm font-semibold text-action">{a.eyebrow}</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">{a.title}</h2>
              <p className="mt-3 max-w-xl text-muted-foreground">{a.body}</p>
              <Button className="mt-6" variant="action" asChild>
                <Link to={a.cta.to}>{a.cta.label}</Link>
              </Button>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {a.points.map((point) => (
                <li key={point} className="surface-panel flex items-center gap-2 p-4 text-sm font-medium">
                  <BadgeCheck className="size-4 text-success" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      {/* Call to action */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl bg-primary px-6 py-12 text-center sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight text-primary-foreground">
            Start building career momentum today
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80">
            Create your GradConnect profile, verify your first skill and see the opportunities that match it.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="action" asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Log In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <p className="text-xs text-muted-foreground">
            Demo data — GradConnect is an academic MVP prototype. Companies, people and opportunities shown are
            fictional examples.
          </p>
        </div>
      </footer>
    </div>
  );
}
