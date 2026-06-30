"use client";

import { useState, useEffect } from "react";
import { isAfter, isBefore, isSameDay } from "date-fns";
import { useSearchParams, useRouter } from "next/navigation";
import { StickyHeader } from "@/components/home/sticky-header";
import { CourtStatusSection, CourtStatus } from "@/components/home/court-status";
import { QuickActionsSection } from "@/components/home/quick-actions";
import { OverviewMetricsSection } from "@/components/home/overview-metrics";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BookingForm } from "@/components/booking/booking-form";
import { BookingDetails } from "@/components/booking/booking-details";
import { CheckoutForm } from "@/components/booking/checkout-form";
import { QuickSaleForm } from "@/components/booking/quick-sale-form";
import { ExpenseForm } from "@/components/home/expense-form";
import { subscribeToBookings } from "@/lib/services/realtime-service";

interface HomeClientProps {
  initialCourts: { id: string; court_name: string }[];
  initialBookings: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  initialTodayInvoices: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  initialCustomers: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export default function HomeClient({ initialCourts, initialBookings, initialTodayInvoices, initialCustomers }: HomeClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      alert(errorParam);
      router.replace('/');
    }
  }, [searchParams, router]);

  const [bookings, setBookings] = useState(initialBookings);
  const [todayInvoices, setTodayInvoices] = useState(initialTodayInvoices);

  useEffect(() => {
    setBookings(initialBookings);
  }, [initialBookings]);

  useEffect(() => {
    setTodayInvoices(initialTodayInvoices);
  }, [initialTodayInvoices]);

  // Realtime subscription setup
  useEffect(() => {
    const unsubscribe = subscribeToBookings(() => {
      router.refresh();
    });
    return () => unsubscribe();
  }, [router]);

  // Refresh page data on mount to invalidate Next.js router cache
  useEffect(() => {
    router.refresh();
  }, [router]);

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isBookingDetailsOpen, setIsBookingDetailsOpen] = useState(false);
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const now = new Date();
  const courtStatuses: CourtStatus[] = initialCourts.map(court => {
    const activeBooking = bookings.find(b =>
      b.court_id === court.id &&
      isAfter(now, new Date(b.start_time)) &&
      isBefore(now, new Date(b.end_time)) &&
      b.status !== 'CANCELLED'
    );

    const upcomingBookings = bookings.filter(b =>
      b.court_id === court.id &&
      isBefore(now, new Date(b.start_time)) &&
      isSameDay(now, new Date(b.start_time)) &&
      b.status !== 'CANCELLED'
    ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const nextBooking = upcomingBookings[0];

    return {
      id: court.id,
      name: court.court_name,
      isAvailable: !activeBooking,
      currentBookingId: activeBooking?.id,
      bookingEndTime: activeBooking?.end_time,
      nextBookingTime: nextBooking?.start_time,
    };
  });

  const todayRevenue = todayInvoices.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;
  const activeCount = courtStatuses.filter(s => !s.isAvailable).length;
  const totalCourts = courtStatuses.length || 1;
  const occupancy = Math.round((activeCount / totalCourts) * 100);

  const metrics = {
    totalRevenue: todayRevenue,
    revenueStatus: "up" as "up" | "down" | "neutral",
    revenueChangePercent: 12,
    occupancyRate: occupancy,
  };

  const handleRefresh = () => {
    router.refresh();
  };

  const handleBookingClick = () => {
    setIsBookingOpen(true);
  };

  const handleViewBookingClick = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setIsBookingDetailsOpen(true);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display min-h-screen flex flex-col overflow-hidden selection:bg-emerald-500 selection:text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col md:pl-64 transition-all overflow-hidden relative">
        <div className="md:hidden">
          <StickyHeader notificationCount={1} />
        </div>
        <div className="hidden md:block">
          <div className="p-8 pb-0">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Tổng quan Hoạt động</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Theo dõi tình trạng sân và quản lý nhanh trong ngày hôm nay.</p>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto w-full p-4 md:p-8 pb-32 md:pb-8 no-scrollbar">
          <div className="max-w-7xl mx-auto flex flex-col gap-6 md:gap-8">
            <CourtStatusSection
              courts={courtStatuses}
              onBookClick={handleBookingClick}
              onViewBookingClick={handleViewBookingClick}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              <QuickActionsSection
                onNewBookingClick={() => setIsBookingOpen(true)}
                onQuickSaleClick={() => setIsQuickSaleOpen(true)}
                onAddExpenseClick={() => setIsExpenseOpen(true)}
              />
              <OverviewMetricsSection {...metrics} />
            </div>
          </div>
        </main>

        <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
          <DialogContent className="p-0 sm:max-w-[480px] h-full sm:h-auto overflow-hidden border-none bg-transparent shadow-none">
            <DialogTitle className="sr-only">Đặt sân</DialogTitle>
            <BookingForm
              selectedDate={new Date()}
              selectedCourtId={initialCourts[0]?.id || null}
              courts={initialCourts}
              customers={initialCustomers}
              onSuccess={() => {
                setIsBookingOpen(false);
                handleRefresh();
              }}
              onCancel={() => setIsBookingOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isQuickSaleOpen} onOpenChange={setIsQuickSaleOpen}>
          <DialogContent className="p-0 sm:max-w-[480px] h-full sm:h-auto overflow-hidden border-none bg-transparent shadow-none">
            <DialogTitle className="sr-only">Bán hàng lẻ</DialogTitle>
            <QuickSaleForm
              onSuccess={() => {
                setIsQuickSaleOpen(false);
                handleRefresh();
              }}
              onCancel={() => setIsQuickSaleOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
          <DialogContent className="p-0 sm:max-w-[480px] h-full sm:h-auto overflow-hidden border-none bg-transparent shadow-none">
            <DialogTitle className="sr-only">Nhập chi phí</DialogTitle>
            <ExpenseForm
              onSuccess={() => {
                setIsExpenseOpen(false);
                handleRefresh();
              }}
              onCancel={() => setIsExpenseOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isBookingDetailsOpen} onOpenChange={setIsBookingDetailsOpen}>
          <DialogContent className="p-0 sm:max-w-[480px] h-full sm:h-auto overflow-hidden border-none bg-transparent shadow-none">
            <DialogTitle className="sr-only">Chi tiết đặt sân</DialogTitle>
            {selectedBookingId && (
              <BookingDetails
                bookingId={selectedBookingId}
                onClose={() => setIsBookingDetailsOpen(false)}
                onCheckInSuccess={() => {
                  setIsBookingDetailsOpen(false);
                  handleRefresh();
                }}
                onCheckOutClick={() => {
                  setIsBookingDetailsOpen(false);
                  setIsCheckoutOpen(true);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
          <DialogContent className="p-0 sm:max-w-[480px] h-full sm:h-auto overflow-hidden border-none bg-transparent shadow-none">
            <DialogTitle className="sr-only">Thanh toán</DialogTitle>
            {selectedBookingId && (
              <CheckoutForm
                bookingId={selectedBookingId}
                onSuccess={() => {
                  setIsCheckoutOpen(false);
                  handleRefresh();
                }}
                onCancel={() => setIsCheckoutOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        <div className="md:hidden flex-none z-50">
          <BottomNav />
        </div>

        <style jsx global>{`
          .no-scrollbar::-webkit-scrollbar {
              display: none;
          }
          .no-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
          }
        `}</style>
      </div>
    </div>
  );
}
