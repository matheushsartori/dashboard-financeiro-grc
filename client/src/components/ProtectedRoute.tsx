import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Login from "@/pages/Login";
import { Skeleton } from "./Skeleton";
import { Card, CardContent, CardHeader } from "./ui/card";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Verificar se está autenticado
    const auth = localStorage.getItem("isAuthenticated");
    setIsAuthenticated(auth === "true");

    // Se não estiver autenticado e não estiver na página de login, redirecionar
    if (auth !== "true" && window.location.pathname !== "/login") {
      setLocation("/login");
    }
  }, [setLocation]);

  // Mostrar loading enquanto verifica autenticação
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se não estiver autenticado, mostrar página de login
  if (!isAuthenticated) {
    return <Login />;
  }

  // Se estiver autenticado, mostrar conteúdo protegido
  return <>{children}</>;
}

// Skeleton para páginas protegidas
export function ProtectedRouteSkeleton() {
  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
