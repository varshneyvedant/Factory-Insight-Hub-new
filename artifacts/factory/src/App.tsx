import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import EmployeesPage from "@/pages/employees";
import EmployeeDetailPage from "@/pages/employee-detail";
import AttendancePage from "@/pages/attendance";
import SalariesPage from "@/pages/salaries";
import AdvancesPage from "@/pages/advances";
import CopperPage from "@/pages/copper";
import ReportsPage from "@/pages/reports";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
});

function AppRoutes() {
  const { data: me, isLoading, isError } = useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if ((isError || !me) && location !== "/login") navigate("/login");
    if (me && location === "/login") navigate("/");
  }, [me, isError, isLoading, location, navigate]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (!me) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route component={LoginPage} />
      </Switch>
    );
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/employees" component={EmployeesPage} />
        <Route path="/employees/:id" component={EmployeeDetailPage} />
        <Route path="/attendance" component={AttendancePage} />
        <Route path="/salaries" component={SalariesPage} />
        <Route path="/advances" component={AdvancesPage} />
        <Route path="/copper" component={CopperPage} />
        {me.role === "owner" && <Route path="/reports" component={ReportsPage} />}
        <Route path="/login" component={DashboardPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
