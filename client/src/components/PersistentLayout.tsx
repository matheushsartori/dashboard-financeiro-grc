import { ReactNode, useMemo } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "./DashboardLayout";

interface PersistentLayoutProps {
  children: ReactNode;
}

// Componente que mantém o layout persistente entre navegações
export function PersistentLayout({ children }: PersistentLayoutProps) {
  const [location] = useLocation();
  
  // Lista de rotas que precisam do layout
  const protectedRoutes = [
    "/dashboard",
    "/receitas",
    "/despesas",
    "/dre",
    "/folha",
    "/importacao",
  ];
  
  const needsLayout = useMemo(() => {
    return protectedRoutes.some(route => location.startsWith(route));
  }, [location]);
  
  if (!needsLayout) {
    return <>{children}</>;
  }
  
  return <DashboardLayout key="persistent-layout">{children}</DashboardLayout>;
}



