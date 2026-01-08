import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Calendar } from "lucide-react";

export type TipoVisualizacao = "realizado" | "projetado" | "todos";

interface RealizadoProjetadoFilterProps {
  value: TipoVisualizacao;
  onChange: (tipo: TipoVisualizacao) => void;
  label?: string;
}

export function RealizadoProjetadoFilter({ 
  value, 
  onChange, 
  label = "Tipo de visualização" 
}: RealizadoProjetadoFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={value}
        onValueChange={(val) => onChange(val as TipoVisualizacao)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="realizado">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              Realizado
            </span>
          </SelectItem>
          <SelectItem value="projetado">
            <span className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-amber-500" />
              Projetado
            </span>
          </SelectItem>
          <SelectItem value="todos">
            <span className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-blue-500" />
              Todos
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}



