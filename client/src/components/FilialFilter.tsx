import { useState } from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type TipoEscopoFilial = "consolidado" | string; // string para códigos de filial separados por vírgula (ex: "1,3,5")

export interface FilialFilterProps {
  value: TipoEscopoFilial;
  onChange: (value: TipoEscopoFilial) => void;
  label?: string;
  uploadId: number | null;
}

export function FilialFilter({ value, onChange, label = "Filtrar por escopo", uploadId }: FilialFilterProps) {
  const [open, setOpen] = useState(false);

  const { data: filiais, isLoading } = trpc.financial.getFiliaisDisponiveis.useQuery(
    { uploadId: uploadId! },
    {
      enabled: !!uploadId,
      staleTime: 5 * 60 * 1000, // Cache de 5 minutos
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <Skeleton className="h-10 w-[250px]" />
      </div>
    );
  }

  // Parse do valor atual para array de códigos
  const selectedCodes = value === "consolidado"
    ? []
    : value.split(",").filter(Boolean).map(Number);

  const isConsolidado = value === "consolidado";
  const hasSelection = selectedCodes.length > 0;

  // Função para alternar seleção de uma filial
  const toggleFilial = (codigo: number) => {
    if (isConsolidado) {
      // Se estava em consolidado, seleciona apenas esta filial
      onChange(codigo.toString());
    } else {
      const newCodes = selectedCodes.includes(codigo)
        ? selectedCodes.filter(c => c !== codigo)
        : [...selectedCodes, codigo].sort((a, b) => a - b);

      // Se não há mais seleções, volta para consolidado
      if (newCodes.length === 0) {
        onChange("consolidado");
      } else {
        onChange(newCodes.join(","));
      }
    }
  };

  // Função para selecionar consolidado
  const selectConsolidado = () => {
    onChange("consolidado");
  };

  // Gerar texto do botão
  const getButtonText = () => {
    if (isConsolidado) {
      return "Consolidado (Todas)";
    }

    if (selectedCodes.length === 1) {
      const filial = filiais?.find(f => f.codigo === selectedCodes[0]);
      return filial ? `Filial ${filial.codigo}` : "1 filial selecionada";
    }

    return `${selectedCodes.length} filiais selecionadas`;
  };

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[280px] justify-between"
          >
            <span className="truncate">{getButtonText()}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <div className="max-h-[300px] overflow-y-auto">
            {/* Opção Consolidado */}
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent",
                isConsolidado && "bg-accent"
              )}
              onClick={selectConsolidado}
            >
              <Checkbox
                checked={isConsolidado}
                onCheckedChange={selectConsolidado}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1">
                <div className="font-medium text-sm">Consolidado GRC</div>
                <div className="text-xs text-muted-foreground">Matriz + Todas as Filiais</div>
              </div>
            </div>

            {/* Separador */}
            {filiais && filiais.length > 0 && (
              <div className="border-t my-1" />
            )}

            {/* Filiais individuais */}
            {filiais && filiais.length > 0 ? (
              filiais.map((filial) => {
                const isSelected = selectedCodes.includes(filial.codigo);
                return (
                  <div
                    key={filial.codigo}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent",
                      isSelected && "bg-accent/50"
                    )}
                    onClick={() => toggleFilial(filial.codigo)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleFilial(filial.codigo)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{filial.nome}</div>
                      <div className="text-xs text-muted-foreground">Filial {filial.codigo}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Nenhuma filial disponível
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Função auxiliar para converter o escopo em array de códigos de filial para filtragem
export function getCodFilialFilter(escopo: TipoEscopoFilial, filiaisDisponiveis?: Array<{ codigo: number }>): number[] | null {
  // Se é "consolidado", retornar todas as filiais disponíveis
  if (escopo === "consolidado") {
    if (filiaisDisponiveis && filiaisDisponiveis.length > 0) {
      return filiaisDisponiveis.map(f => f.codigo);
    }
    // Fallback para compatibilidade (caso não tenha filiais ainda)
    return null; // null significa todas as filiais
  }

  // Se não é "consolidado", pode ser uma ou múltiplas filiais (string numérica ou "1,3,5")
  const codigos = escopo.split(",").map(c => parseInt(c.trim())).filter(c => !isNaN(c));

  if (codigos.length === 0) {
    return null;
  }

  return codigos;
}
