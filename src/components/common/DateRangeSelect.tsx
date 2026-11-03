import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface DateRangeSelectProps {
  value: string;
  onChange: (range: string) => void;
  className?: string;
}

export function DateRangeSelect({
  value,
  onChange,
  className = "w-36",
}: DateRangeSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className} aria-label="Filter by date range">
        <SelectValue placeholder="Date range" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All time</SelectItem>
        <SelectItem value="day">Today</SelectItem>
        <SelectItem value="week">This week</SelectItem>
        <SelectItem value="month">This month</SelectItem>
        <SelectItem value="year">This year</SelectItem>
      </SelectContent>
    </Select>
  );
}
