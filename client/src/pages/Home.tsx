import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { Streamdown } from 'streamdown';

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={APP_LOGO} alt="Logo" className="h-8 w-8" />
            <span className="text-xl font-bold">{APP_TITLE}</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground">Olá, {user?.name}</span>
                <Button variant="outline" size="sm" asChild>
                  <a href="/dashboard">Acessar Dashboard</a>
                </Button>
              </>
            ) : (
              <Button size="sm" asChild>
                <a href={getLoginUrl()}>Entrar</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
              Dashboard Financeiro <span className="text-primary">Inteligente</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Importe suas planilhas Excel e visualize seus dados financeiros com gráficos interativos,
              resumos automáticos e análises detalhadas. Simplifique sua gestão financeira.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <>
                  <Button size="lg" asChild>
                    <a href="/importacao">Importar Dados</a>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a href="/dashboard">Ver Dashboard</a>
                  </Button>
                </>
              ) : (
                <Button size="lg" asChild>
                  <a href={getLoginUrl()}>Comece Agora</a>
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container py-16 md:py-24">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold text-center mb-12">Principais Funcionalidades</h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Importação Rápida</h3>
                <p className="text-muted-foreground">
                  Faça upload de planilhas Excel e processe automaticamente todos os dados financeiros.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Gráficos Interativos</h3>
                <p className="text-muted-foreground">
                  Visualize receitas, despesas e folha de pagamento com gráficos dinâmicos e intuitivos.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Análises Detalhadas</h3>
                <p className="text-muted-foreground">
                  Acesse relatórios completos de fornecedores, clientes e centros de custo.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2025 {APP_TITLE}. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
