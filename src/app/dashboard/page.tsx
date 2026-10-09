import { format, parse } from "date-fns";
import { getDashboardData } from "@/server/repositories/dashboard-repo";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
    searchParams?: {
        month?: string | string[];
    };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
    const rawMonth = typeof searchParams?.month === "string" ? searchParams.month : undefined;
    const currentMonthStr = format(new Date(), "yyyy-MM");
    const monthParam = rawMonth || currentMonthStr;

    // Safely parse month parameter
    let selectedDate = new Date();
    if (rawMonth) {
        try {
            const parsed = parse(`${rawMonth}-01`, "yyyy-MM-dd", new Date());
            if (!isNaN(parsed.getTime())) {
                selectedDate = parsed;
            }
        } catch {
            selectedDate = new Date();
        }
    }

    const data = await getDashboardData(selectedDate);

    return (
        <DashboardClient initialData={data} selectedMonth={monthParam} />
    );
}
