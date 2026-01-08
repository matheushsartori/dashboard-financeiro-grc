import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";

interface MonthYearFilterProps {
  month: number | null;
  year: number | null;
  onMonthChange: (month: number | null) => void;
  onYearChange: (year: number | null) => void;
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

// Gerar anos de 2024 até 2030
const YEARS = Array.from({ length: 7 }, (_, i) => 2024 + i);

export function MonthYearFilter({ 
  month, 
  year, 
  onMonthChange, 
  onYearChange, 
  label = "Filtrar por período" 
}: MonthYearFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select
        value={month?.toString() || "all"}
        onValueChange={(val) => onMonthChange(val === "all" ? null : parseInt(val))}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Mês" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os meses</SelectItem>
          {MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value.toString()}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select
        value={year?.toString() || "all"}
        onValueChange={(val) => onYearChange(val === "all" ? null : parseInt(val))}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Ano" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os anos</SelectItem>
          {YEARS.map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {(month || year) && (
        <span className="text-sm text-muted-foreground">
          {month && year && `(${MONTHS.find(m => m.value === month)?.label}/${year})`}
          {month && !year && `(${MONTHS.find(m => m.value === month)?.label})`}
          {!month && year && `(${year})`}
        </span>
      )}
    </div>
  );
}

