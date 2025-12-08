import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";

export type TipoEscopoFilial = "consolidado" | string; // string para códigos de filial dinâmicos

export interface FilialFilterProps {
  value: TipoEscopoFilial;
  onChange: (value: TipoEscopoFilial) => void;
  label?: string;
  uploadId: number | null;
}

export function FilialFilter({ value, onChange, label = "Filtrar por escopo", uploadId }: FilialFilterProps) {
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

  // Garantir que sempre temos pelo menos a opção consolidado
  const opcoes = [
    { value: "consolidado", label: "Consolidado GRC (Matriz + Todas as Filiais)", codFilial: null },
    ...(filiais && filiais.length > 0 ? filiais.map((filial) => ({
      value: filial.codigo.toString(),
      label: `${filial.nome} - Filial ${filial.codigo}`,
      codFilial: filial.codigo,
    })) : []),
  ];

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={value}
        onValueChange={(val) => onChange(val as TipoEscopoFilial)}
      >
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((opcao) => (
            <SelectItem key={opcao.value} value={opcao.value}>
              {opcao.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Função auxiliar para converter o escopo em array de códigos de filial para filtragem
export function getCodFilialFilter(escopo: TipoEscopoFilial, filiaisDisponiveis?: Array<{ codigo: number }>): number[] | null {
  // Se não é "consolidado", é uma filial específica (string numérica)
  if (escopo !== "consolidado") {
    const codFilial = parseInt(escopo);
    if (isNaN(codFilial)) {
      return null;
    }
    return [codFilial];
  }
  
  // Se é "consolidado", retornar todas as filiais disponíveis
  if (filiaisDisponiveis && filiaisDisponiveis.length > 0) {
    return filiaisDisponiveis.map(f => f.codigo);
  }
  
  // Fallback para compatibilidade (caso não tenha filiais ainda)
  return null; // null significa todas as filiais
}

