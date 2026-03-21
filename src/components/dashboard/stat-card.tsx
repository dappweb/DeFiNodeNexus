import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, description, trend, className }: StatCardProps) {
  return (
    <Card className={cn("p-6 glass-panel flex flex-col gap-2 relative overflow-hidden group hover:border-primary/50 transition-all duration-300", className)}>
      <div className="absolute -right-4 -top-4 text-primary/5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Icon size={120} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Icon size={20} />
        </div>
      </div>
      <div className="mt-1">
        <h3 className="text-2xl font-bold font-headline">{value}</h3>
        {trend && (
          <p className={cn("text-xs mt-1", trend.positive ? "text-accent" : "text-destructive")}>
            {trend.positive ? "+" : "-"}{trend.value} from last month
          </p>
        )}
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
    </Card>
  );
}