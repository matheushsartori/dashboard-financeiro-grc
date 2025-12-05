import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";

interface MonthFilterProps {
  value: number | null;
  onChange: (month: number | null) => void;
  label?: string;
}

const MONTHS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

export function MonthFilter({ value, onChange, label = "Filtrar por mês" }: MonthFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select
        value={value?.toString() || "all"}
        onValueChange={(val) => onChange(val === "all" ? null : parseInt(val))}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os meses</SelectItem>
          {MONTHS.map((month) => (
            <SelectItem key={month.value} value={month.value.toString()}>
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && (
        <span className="text-sm text-muted-foreground">
          ({MONTHS.find(m => m.value === value)?.label})
        </span>
      )}
    </div>
  );
}



