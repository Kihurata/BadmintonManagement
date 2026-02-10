
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface CourtProps {
  court: {
    id: string;
    court_name: string;
    morning_price_guest: number;
    evening_price_guest: number;
    is_active: boolean;
  };
}

export function CourtCard({ court }: CourtProps) {
  return (
    <Card className="w-full hover:shadow-lg transition-shadow border-l-4 border-l-emerald-500 bg-slate-800 text-slate-100">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-bold text-white">{court.court_name}</CardTitle>
          <Badge variant={court.is_active ? "default" : "destructive"} className={court.is_active ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
            {court.is_active ? "Active" : "Maintenance"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 text-sm text-slate-300">
          <div className="flex justify-between">
            <span>Morning (Guest):</span>
            <span className="font-medium text-emerald-400">{formatCurrency(court.morning_price_guest)}</span>
          </div>
          <div className="flex justify-between">
            <span>Evening (Guest):</span>
            <span className="font-medium text-emerald-400">{formatCurrency(court.evening_price_guest)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
