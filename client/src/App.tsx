import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import { lazy, Suspense, useMemo } from "react";
import DashboardLayout from "./components/DashboardLayout";
import { ProtectedRouteSkeleton } from "./components/ProtectedRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Receitas = lazy(() => import("./pages/Receitas"));
const ReceitasEmpresa = lazy(() => import("./pages/ReceitasEmpresa"));
const Despesas = lazy(() => import("./pages/Despesas"));
const DespesasFornecedor = lazy(() => import("./pages/DespesasFornecedor"));
const DRE = lazy(() => import("./pages/DRE"));
const Folha = lazy(() => import("./pages/Folha"));
const Importacao = lazy(() => import("./pages/Importacao"));

// Rotas que precisam do layout
const protectedRoutes = [
  "/dashboard",
  "/receitas",
  "/despesas",
  "/dre",
  "/folha",
  "/importacao",
];

function Router() {
  const [location] = useLocation();
  const needsLayout = useMemo(() => {
    return protectedRoutes.some(route => location.startsWith(route));
  }, [location]);

  const routes = (
    <Suspense fallback={needsLayout ? <ProtectedRouteSkeleton /> : <div className="flex items-center justify-center min-h-screen"><div>Carregando...</div></div>}>
      <Switch>
        <Route path={"/login"} component={Login} />
        <Route path={"/"} component={Home} />
        <Route path={"/dashboard"}>
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>
        <Route path={"/receitas"}>
          <ProtectedRoute>
            <Receitas />
          </ProtectedRoute>
        </Route>
        <Route path={"/receitas/empresa"}>
          <ProtectedRoute>
            <ReceitasEmpresa />
          </ProtectedRoute>
        </Route>
        <Route path={"/despesas"}>
          <ProtectedRoute>
            <Despesas />
          </ProtectedRoute>
        </Route>
        <Route path={"/despesas/fornecedor"}>
          <ProtectedRoute>
            <DespesasFornecedor />
          </ProtectedRoute>
        </Route>
        <Route path={"/dre"}>
          <ProtectedRoute>
            <DRE />
          </ProtectedRoute>
        </Route>
        <Route path={"/folha"}>
          <ProtectedRoute>
            <Folha />
          </ProtectedRoute>
        </Route>
        <Route path={"/importacao"}>
          <ProtectedRoute>
            <Importacao />
          </ProtectedRoute>
        </Route>
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );

  if (needsLayout) {
    return <DashboardLayout key="persistent-layout">{routes}</DashboardLayout>;
  }

  return routes;
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
