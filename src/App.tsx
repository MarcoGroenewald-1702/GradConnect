import { useEffect } from "react";
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
};

/** Sets the browser tab title and scrolls to the top when the page changes. */
function PageEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = titles[pathname] ?? titles["/" + pathname.split("/")[1]] ?? "Page not found — GradConnect";
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
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster position="top-right" />
        </BrowserRouter>
      </StoreProvider>
    </QueryClientProvider>
  );
}
