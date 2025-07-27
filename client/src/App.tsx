import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import AuthPage from "@/pages/auth-page";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/prisijungimas" component={AuthPage} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tennis-green-600"></div>
          </div>
        ) : !user ? (
          <Landing />
        ) : user?.isAdmin ? (
          <Admin />
        ) : (
          <Dashboard />
        )}
      </Route>
      <Route path="/dashboard">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tennis-green-600"></div>
          </div>
        ) : user && !user?.isAdmin ? (
          <Dashboard />
        ) : (
          <Landing />
        )}
      </Route>
      <Route path="/savitarna">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tennis-green-600"></div>
          </div>
        ) : user && !user?.isAdmin ? (
          <Dashboard />
        ) : (
          <Landing />
        )}
      </Route>
      <Route path="/admin">
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tennis-green-600"></div>
          </div>
        ) : user && user?.isAdmin ? (
          <Admin />
        ) : (
          <Landing />
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
