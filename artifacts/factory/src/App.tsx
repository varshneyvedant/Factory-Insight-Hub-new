import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
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
import ProductionPage from "@/pages/production";
import StockPage from "@/pages/stock";
import OrdersPage from "@/pages/orders";
import CustomersPage from "@/pages/customers";
import ReportsPage from "@/pages/reports";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
});

function AppRoutes() {
  const { data: me, isLoading } = useGetMe({ query: { retry: false, queryKey: getGetMeQueryKey() } });
  const [location] = useLocation();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (!me) {
    if (location !== "/login") return <Redirect to="/login" />;
    return <LoginPage />;
  }

  if (location === "/login") return <Redirect to="/" />;

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
        <Route path="/production" component={ProductionPage} />
        <Route path="/stock" component={StockPage} />
        <Route path="/orders" component={OrdersPage} />
        <Route path="/customers" component={CustomersPage} />
        {me.role === "owner" && <Route path="/reports" component={ReportsPage} />}
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
