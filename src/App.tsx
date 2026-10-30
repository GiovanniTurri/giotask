import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import CalendarPage from "./pages/CalendarPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import SettingsPage from "./pages/SettingsPage";
import CoupleLifePage from "./pages/CoupleLifePage";
import PeoplePage from "./pages/PeoplePage";
import MagicLandingPage from "./pages/MagicLandingPage";
import NotFound from "./pages/NotFound";
import { useReminders } from "@/hooks/useReminders";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import BookPage from "./pages/BookPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false } },
});

function RemindersMount() {
  useReminders();
  return null;
}

function AppShell() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <LoginPage />;
  return (
    <div className="flex min-h-screen">
      <RemindersMount />
      <AppSidebar />
      <main className="flex-1 ml-16 lg:ml-56 p-6 lg:p-8">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/couple-life" element={<CoupleLifePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/magic" element={<MagicLandingPage />} />
            <Route path="/book" element={<BookPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="/*" element={<AppShell />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
