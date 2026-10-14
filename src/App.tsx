import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { StoreProvider } from "@/lib/store";
import AssessmentTake from "@/pages/AssessmentTake";
import Assessments from "@/pages/Assessments";
import Dashboard from "@/pages/Dashboard";
import Home from "@/pages/Home";
import Learn from "@/pages/Learn";
import LearnModule from "@/pages/LearnModule";
import Login from "@/pages/Login";
import MentorDetail from "@/pages/MentorDetail";
import Mentors from "@/pages/Mentors";
import NotFound from "@/pages/NotFound";
import Onboarding from "@/pages/Onboarding";
import Profile from "@/pages/Profile";
import Signup from "@/pages/Signup";
import Skills from "@/pages/Skills";
import Opportunities from "@/pages/Opportunities";
import OpportunityDetail from "@/pages/OpportunityDetail";
import Applications from "@/pages/Applications";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";

// Employer, mentor and admin pages load on demand so graduates download less
const EmployerDashboard = lazy(
  () => import("@/pages/employer/EmployerDashboard"),
);
const EmployerOpportunities = lazy(
  () => import("@/pages/employer/EmployerOpportunities"),
);
const EmployerApplicants = lazy(
  () => import("@/pages/employer/EmployerApplicants"),
);
const EmployerCandidates = lazy(
  () => import("@/pages/employer/EmployerCandidates"),
);
const EmployerShortlist = lazy(
  () => import("@/pages/employer/EmployerShortlist"),
);
const MentorDashboard = lazy(() => import("@/pages/mentor/MentorDashboard"));
const MentorAvailability = lazy(
  () => import("@/pages/mentor/MentorAvailability"),
);
const MentorMentees = lazy(() => import("@/pages/mentor/MentorMentees"));
const AdminOverview = lazy(() => import("@/pages/admin/AdminOverview"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));

const titles: Record<string, string> = {
  "/": "GradConnect — Turn Your IT Qualification Into Career Momentum",
  "/dashboard": "Graduate Dashboard — GradConnect",
  "/login": "Log In — GradConnect",
  "/signup": "Create your account — GradConnect",
  "/onboarding": "Build your career profile — GradConnect",
  "/profile": "Profile & Skills — GradConnect",
  "/skills": "Verify a Skill — GradConnect",
  "/assessments": "Assessments — GradConnect",
  "/learn": "Learn — GradConnect",
  "/mentors": "Mentors — GradConnect",
  "/opportunities": "Opportunities — GradConnect",
  "/applications": "My Applications — GradConnect",
  "/notifications": "Notifications — GradConnect",
  "/settings": "Settings — GradConnect",
  "/employer/dashboard": "Employer Dashboard — GradConnect",
  "/employer/opportunities": "Your Opportunities — GradConnect",
  "/employer/candidates": "Find Candidates — GradConnect",
  "/employer/shortlisted": "Shortlisted Candidates — GradConnect",
  "/mentor/dashboard": "Mentor Dashboard — GradConnect",
  "/mentor/availability": "Availability — GradConnect",
  "/mentor/mentees": "Your Mentees — GradConnect",
  "/admin": "Platform Overview — GradConnect",
  "/admin/users": "Users — GradConnect",
};

/** Sets the browser tab title and scrolls to the top when the page changes. */
function PageEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title =
      titles[pathname] ??
      titles[pathname.split("/").slice(0, 3).join("/")] ??
      titles["/" + pathname.split("/")[1]] ??
      "Page not found — GradConnect";
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <BrowserRouter>
          <PageEffects />
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center bg-surface text-sm text-muted-foreground">
                Loading…
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/skills" element={<Skills />} />
              <Route path="/assessments" element={<Assessments />} />
              <Route path="/assessments/:id" element={<AssessmentTake />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/learn/:id" element={<LearnModule />} />
              <Route path="/mentors" element={<Mentors />} />
              <Route path="/mentors/:id" element={<MentorDetail />} />
              <Route path="/opportunities" element={<Opportunities />} />
              <Route
                path="/opportunities/:id"
                element={<OpportunityDetail />}
              />
              <Route path="/applications" element={<Applications />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/employer" element={<EmployerDashboard />} />
              <Route
                path="/employer/dashboard"
                element={<EmployerDashboard />}
              />
              <Route
                path="/employer/opportunities"
                element={<EmployerOpportunities />}
              />
              <Route
                path="/employer/opportunities/:id"
                element={<EmployerApplicants />}
              />
              <Route
                path="/employer/candidates"
                element={<EmployerCandidates />}
              />
              <Route
                path="/employer/shortlisted"
                element={<EmployerShortlist />}
              />
              <Route path="/mentor" element={<MentorDashboard />} />
              <Route path="/mentor/dashboard" element={<MentorDashboard />} />
              <Route
                path="/mentor/availability"
                element={<MentorAvailability />}
              />
              <Route path="/mentor/mentees" element={<MentorMentees />} />
              <Route path="/admin" element={<AdminOverview />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <Toaster position="top-right" />
        </BrowserRouter>
      </StoreProvider>
    </QueryClientProvider>
  );
}
