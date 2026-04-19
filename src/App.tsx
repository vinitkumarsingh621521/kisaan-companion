import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AnimatePresence } from "framer-motion";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import CropAdvisor from "./pages/CropAdvisor";
import MarketPage from "./pages/MarketPage";
import SchemesPage from "./pages/SchemesPage";
import CommunityPage from "./pages/CommunityPage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import NewsPage from "./pages/NewsPage";
import ResearchPage from "./pages/ResearchPage";
import TeamPage from "./pages/TeamPage";
import AdminTeamPage from "./pages/AdminTeamPage";
import FieldMapperPage from "./pages/tools/FieldMapperPage";
import ReportsPage from "./pages/tools/ReportsPage";
import SatellitePage from "./pages/tools/SatellitePage";
import IoTPage from "./pages/tools/IoTPage";
import AchievementsPage from "./pages/tools/AchievementsPage";
import OfflinePage from "./pages/tools/OfflinePage";
import NotFound from "./pages/NotFound";
import AuthGuard from "./components/AuthGuard";
import PageTransition from "./components/PageTransition";
import BackToTop from "./components/BackToTop";
import { ActiveProfileProvider } from "./hooks/useActiveProfile";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><AuthPage /></PageTransition>} />
        <Route path="/dashboard" element={<PageTransition><AuthGuard><Dashboard /></AuthGuard></PageTransition>} />
        <Route path="/crop-advisor" element={<PageTransition><AuthGuard><CropAdvisor /></AuthGuard></PageTransition>} />
        <Route path="/market" element={<PageTransition><AuthGuard><MarketPage /></AuthGuard></PageTransition>} />
        <Route path="/schemes" element={<PageTransition><AuthGuard><SchemesPage /></AuthGuard></PageTransition>} />
        <Route path="/community" element={<PageTransition><AuthGuard><CommunityPage /></AuthGuard></PageTransition>} />
        <Route path="/profile" element={<PageTransition><AuthGuard><ProfilePage /></AuthGuard></PageTransition>} />
        <Route path="/news" element={<PageTransition><NewsPage /></PageTransition>} />
        <Route path="/research" element={<PageTransition><ResearchPage /></PageTransition>} />
        <Route path="/team" element={<PageTransition><TeamPage /></PageTransition>} />
        <Route path="/admin/team" element={<PageTransition><AuthGuard><AdminTeamPage /></AuthGuard></PageTransition>} />
        <Route path="/tools/field-mapper" element={<PageTransition><AuthGuard><FieldMapperPage /></AuthGuard></PageTransition>} />
        <Route path="/tools/reports" element={<PageTransition><AuthGuard><ReportsPage /></AuthGuard></PageTransition>} />
        <Route path="/tools/satellite" element={<PageTransition><AuthGuard><SatellitePage /></AuthGuard></PageTransition>} />
        <Route path="/tools/iot" element={<PageTransition><AuthGuard><IoTPage /></AuthGuard></PageTransition>} />
        <Route path="/tools/achievements" element={<PageTransition><AuthGuard><AchievementsPage /></AuthGuard></PageTransition>} />
        <Route path="/tools/offline" element={<PageTransition><OfflinePage /></PageTransition>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
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
            <AnimatedRoutes />
            <BackToTop />
          </ActiveProfileProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
