import { memo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { APP_LOGO, APP_TITLE } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, PanelLeft, Users, TrendingUp, TrendingDown, Wallet, Upload, FileText } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { FilialFilter, TipoEscopoFilial } from "./FilialFilter";
import { trpc } from "@/lib/trpc";
import { ThemeToggle } from "./ThemeToggle";

const menuItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    description: "Visão geral e métricas principais",
    path: "/dashboard",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    hoverColor: "hover:bg-blue-500/20",
    activeColor: "bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-l-4 border-blue-500"
  },
  {
    icon: TrendingUp,
    label: "Receitas",
    description: "Análise de receitas e faturamento",
    path: "/receitas",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    hoverColor: "hover:bg-green-500/20",
    activeColor: "bg-gradient-to-r from-green-500/20 to-green-600/20 border-l-4 border-green-500"
  },
  {
    icon: TrendingDown,
    label: "Despesas",
    description: "Controle de despesas e custos",
    path: "/despesas",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    hoverColor: "hover:bg-red-500/20",
    activeColor: "bg-gradient-to-r from-red-500/20 to-red-600/20 border-l-4 border-red-500"
  },
  {
    icon: FileText,
    label: "DRE",
    description: "Demonstração do Resultado do Exercício",
    path: "/dre",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    hoverColor: "hover:bg-purple-500/20",
    activeColor: "bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-l-4 border-purple-500"
  },
  {
    icon: Wallet,
    label: "Folha de Pagamento",
    description: "Gestão de salários e benefícios",
    path: "/folha",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    hoverColor: "hover:bg-amber-500/20",
    activeColor: "bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-l-4 border-amber-500"
  },
  {
    icon: Upload,
    label: "Importação",
    description: "Upload e gerenciamento de dados",
    path: "/importacao",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    hoverColor: "hover:bg-cyan-500/20",
    activeColor: "bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 border-l-4 border-cyan-500"
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

const DashboardLayoutComponent = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  // Remover autenticação - acesso direto
  const user = { name: "Usuário", email: "usuario@grc.com" };

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const user = { name: "Usuário", email: "usuario@grc.com" };
  const logout = () => {
    localStorage.removeItem("isAuthenticated");
    window.location.href = "/login";
  };
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const uploadId = searchParams.get("uploadId");
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  // Buscar uploads e filiais para o seletor no header
  const { data: uploads } = trpc.financial.listUploads.useQuery();
  const latestUpload = useMemo(() => {
    if (uploadId) return parseInt(uploadId);
    if (uploads && uploads.length > 0) return uploads[0].id;
    return null;
  }, [uploadId, uploads]);

  const { data: filiaisDisponiveis } = trpc.financial.getFiliaisDisponiveis.useQuery(
    { uploadId: latestUpload! },
    { enabled: !!latestUpload }
  );

  // Utils do tRPC para invalidar queries
  const utils = trpc.useUtils();

  // Estado do escopo de filial no header
  const [escopoFilial, setEscopoFilial] = useState<TipoEscopoFilial>(() => {
    const saved = localStorage.getItem("selectedFilial");
    return saved || "consolidado";
  });

  // Atualizar quando mudar no localStorage
  useEffect(() => {
    const handleFilialChanged = () => {
      const saved = localStorage.getItem("selectedFilial");
      if (saved && saved !== escopoFilial) {
        setEscopoFilial(saved);
        // Invalidar queries para forçar refetch com nova filial
        utils.invalidate();
      }
    };
    window.addEventListener("storage", handleFilialChanged);
    window.addEventListener("filialChanged", handleFilialChanged);
    return () => {
      window.removeEventListener("storage", handleFilialChanged);
      window.removeEventListener("filialChanged", handleFilialChanged);
    };
  }, [escopoFilial, utils]);

  // Handler para mudança de filial no header
  const handleFilialChange = (value: TipoEscopoFilial) => {
    localStorage.setItem("selectedFilial", value);
    setEscopoFilial(value);
    // Disparar evento customizado para atualizar outros componentes
    window.dispatchEvent(new Event("filialChanged"));
    // Invalidar todas as queries financeiras para forçar refetch imediato com nova filial
    utils.financial.invalidate();
  };

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0 bg-gradient-to-b from-slate-50 via-slate-50/95 to-slate-100/90 dark:from-slate-950 dark:via-slate-900/95 dark:to-slate-950/90"
          disableTransition={isResizing}
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.03) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.03) 0%, transparent 50%),
              radial-gradient(circle at 40% 20%, rgba(34, 197, 94, 0.02) 0%, transparent 50%)
            `
          }}
        >
          <SidebarHeader className="h-16 justify-center border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center gap-3 pl-2 group-data-[collapsible=icon]:px-0 transition-all w-full">
              {!isCollapsed ? (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg blur-sm" />
                      <img
                        src={APP_LOGO}
                        className="relative h-9 w-9 rounded-lg object-cover ring-2 ring-primary/20 shrink-0"
                        alt="Logo"
                      />
                    </div>
                    <span className="font-bold text-lg bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent tracking-tight truncate">
                      {APP_TITLE}
                    </span>
                  </div>
                  <button
                    onClick={toggleSidebar}
                    className="ml-auto h-8 w-8 flex items-center justify-center hover:bg-primary/10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
                  >
                    <PanelLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                </>
              ) : (
                <button
                  onClick={toggleSidebar}
                  className="h-8 w-8 flex items-center justify-center hover:bg-primary/10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
                >
                  <PanelLeft className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 py-2">
            <SidebarMenu className="px-3 space-y-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <button
                      onClick={() => setLocation(item.path)}
                      className={`
                        w-full flex items-start gap-3 px-3 py-3 rounded-xl
                        transition-all duration-200 text-left
                        ${isActive
                          ? `${item.activeColor} text-foreground shadow-md border-l-4`
                          : `hover:bg-accent/50 text-muted-foreground hover:text-foreground border-l-4 border-transparent`
                        }
                        group-data-[collapsible=icon]:justify-center
                        group-data-[collapsible=icon]:px-2
                        group-data-[collapsible=icon]:items-center
                      `}
                      title={`${item.label} - ${item.description}`}
                    >
                      <div className={`
                        h-10 w-10 rounded-lg flex items-center justify-center shrink-0
                        transition-all duration-200
                        ${isActive
                          ? `${item.bgColor} ${item.color}`
                          : `bg-muted/50 text-muted-foreground group-hover:${item.bgColor} group-hover:${item.color}`
                        }
                      `}>
                        <item.icon className="h-5 w-5" />
                      </div>

                      <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                        <div className={`text-sm font-semibold truncate ${isActive ? 'text-foreground' : ''}`}>
                          {item.label}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5 leading-tight">
                          {item.description}
                        </div>
                      </div>
                    </button>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t bg-gradient-to-r from-primary/5 to-transparent">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-primary/10 transition-all duration-200 w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full blur-sm" />
                    <Avatar className="relative h-9 w-9 border-2 border-primary/20 shrink-0 ring-2 ring-primary/10">
                      <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary/20 to-primary/10">
                        {user?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-semibold truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {/* Header com seletor de filial */}
        <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
          <div className="flex items-center gap-4 flex-1">
            {isMobile && (
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
            )}
            <div className="flex items-center gap-3">
              <span className="tracking-tight text-foreground font-medium">
                {activeMenuItem?.label ?? APP_TITLE}
              </span>
            </div>
          </div>

          {/* Seletor de Filial e Theme Toggle no Header */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {latestUpload && (
              <FilialFilter
                value={escopoFilial}
                onChange={handleFilialChange}
                uploadId={latestUpload}
                label="Escopo"
              />
            )}
          </div>
        </div>
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
};

// Usar React.memo para manter o layout persistente entre navegações
const DashboardLayout = memo(DashboardLayoutComponent);
DashboardLayout.displayName = "DashboardLayout";

export default DashboardLayout;
