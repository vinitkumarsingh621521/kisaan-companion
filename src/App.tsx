import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AnimatePresence } from "framer-motion";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import AuthGuard from "./components/AuthGuard";
import PageTransition from "./components/PageTransition";
import BackToTop from "./components/BackToTop";
import ActiveProfileBar from "./components/ActiveProfileBar";
import RouteSkeleton from "./components/RouteSkeleton";
import ErrorBoundary from "./components/ErrorBoundary";
import { ActiveProfileProvider } from "./hooks/useActiveProfile";

// Lazy-loaded routes (code-split into separate chunks)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CropAdvisor = lazy(() => import("./pages/CropAdvisor"));
const MarketPage = lazy(() => import("./pages/MarketPage"));
const SchemesPage = lazy(() => import("./pages/SchemesPage"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NewsPage = lazy(() => import("./pages/NewsPage"));
const ResearchPage = lazy(() => import("./pages/ResearchPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const AdminTeamPage = lazy(() => import("./pages/AdminTeamPage"));
const FieldMapperPage = lazy(() => import("./pages/tools/FieldMapperPage"));
const ReportsPage = lazy(() => import("./pages/tools/ReportsPage"));
const SatellitePage = lazy(() => import("./pages/tools/SatellitePage"));
const IoTPage = lazy(() => import("./pages/tools/IoTPage"));
const AchievementsPage = lazy(() => import("./pages/tools/AchievementsPage"));
const OfflinePage = lazy(() => import("./pages/tools/OfflinePage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,         // 5 min — no refetch storm on tab switch
      gcTime: 30 * 60 * 1000,           // keep cache 30 min
      refetchOnWindowFocus: false,       // critical: stops the "tab switch reload" issue
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

const lazyRoute = (el: JSX.Element) => (
  <Suspense fallback={<RouteSkeleton />}>{el}</Suspense>
);

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <>
      <ActiveProfileBar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Index /></PageTransition>} />
          <Route path="/auth" element={<PageTransition><AuthPage /></PageTransition>} />
          <Route path="/dashboard" element={<PageTransition><AuthGuard>{lazyRoute(<Dashboard />)}</AuthGuard></PageTransition>} />
          <Route path="/crop-advisor" element={<PageTransition><AuthGuard>{lazyRoute(<CropAdvisor />)}</AuthGuard></PageTransition>} />
          <Route path="/market" element={<PageTransition><AuthGuard>{lazyRoute(<MarketPage />)}</AuthGuard></PageTransition>} />
          <Route path="/schemes" element={<PageTransition><AuthGuard>{lazyRoute(<SchemesPage />)}</AuthGuard></PageTransition>} />
          <Route path="/community" element={<PageTransition><AuthGuard>{lazyRoute(<CommunityPage />)}</AuthGuard></PageTransition>} />
          <Route path="/profile" element={<PageTransition><AuthGuard>{lazyRoute(<ProfilePage />)}</AuthGuard></PageTransition>} />
          <Route path="/news" element={<PageTransition>{lazyRoute(<NewsPage />)}</PageTransition>} />
          <Route path="/research" element={<PageTransition>{lazyRoute(<ResearchPage />)}</PageTransition>} />
          <Route path="/team" element={<PageTransition>{lazyRoute(<TeamPage />)}</PageTransition>} />
          <Route path="/admin/team" element={<PageTransition><AuthGuard>{lazyRoute(<AdminTeamPage />)}</AuthGuard></PageTransition>} />
          <Route path="/tools/field-mapper" element={<PageTransition><AuthGuard>{lazyRoute(<FieldMapperPage />)}</AuthGuard></PageTransition>} />
          <Route path="/tools/reports" element={<PageTransition><AuthGuard>{lazyRoute(<ReportsPage />)}</AuthGuard></PageTransition>} />
          <Route path="/tools/satellite" element={<PageTransition><AuthGuard>{lazyRoute(<SatellitePage />)}</AuthGuard></PageTransition>} />
          <Route path="/tools/iot" element={<PageTransition><AuthGuard>{lazyRoute(<IoTPage />)}</AuthGuard></PageTransition>} />
          <Route path="/tools/achievements" element={<PageTransition><AuthGuard>{lazyRoute(<AchievementsPage />)}</AuthGuard></PageTransition>} />
          <Route path="/tools/offline" element={<PageTransition>{lazyRoute(<OfflinePage />)}</PageTransition>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ActiveProfileProvider>
            <ErrorBoundary>
              <AnimatedRoutes />
            </ErrorBoundary>
            <BackToTop />
          </ActiveProfileProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
