"use client";

import { useState, useEffect } from "react";
import { startOfToday, format, isAfter, isBefore } from "date-fns";

import { supabase } from "@/lib/supabase";

import { StickyHeader } from "@/components/home/sticky-header";
import { CourtStatusSection, CourtStatus } from "@/components/home/court-status";
import { QuickActionsSection } from "@/components/home/quick-actions";
import { OverviewMetricsSection } from "@/components/home/overview-metrics";
import { BottomNav } from "@/components/layout/bottom-nav";

// Existing Dialogs to reuse
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { BookingForm } from "@/components/booking/booking-form";
import { BookingDetails } from "@/components/booking/booking-details";
import { CheckoutForm } from "@/components/booking/checkout-form";

export default function HomePage() {
  const [loading, setLoading] = useState(true);

  // Data States
  const [courts, setCourts] = useState<{ id: string; court_name: string }[]>([]);
  const [courtStatuses, setCourtStatuses] = useState<CourtStatus[]>([]);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    revenueStatus: "neutral" as "up" | "down" | "neutral",
    revenueChangePercent: 0,
    occupancyRate: 0,
  });

  // Dialog States
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isBookingDetailsOpen, setIsBookingDetailsOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  useEffect(() => {
    fetchHomeData();
    // Optional: Setup real-time listener or interval here if needed
  }, []);

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      const todayStartStr = format(startOfToday(), "yyyy-MM-dd'T'HH:mm:ssXXX");

      // 1. Fetch Courts
      const { data: courtsData } = await supabase
        .from('courts')
        .select('id, court_name')
        .order('court_name');

      if (courtsData) setCourts(courtsData);

      // 2. Fetch Today's Bookings
      // We need to know which courts are CURRENTLY active
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          id, 
          court_id, 
          start_time, 
          end_time, 
          status,
          booking_type
        `)
        .eq('status', 'ACTIVE'); // Only care about currently active bookings for the "In Use" status

      // Map Courts to Statuses
      const mappedStatuses: CourtStatus[] = (courtsData || []).map(court => {
        // Find if this court has an active booking RIGHT NOW
        const now = new Date();
        const activeBooking = bookingsData?.find(b =>
          b.court_id === court.id &&
          isAfter(now, new Date(b.start_time)) &&
          isBefore(now, new Date(b.end_time))
        );

        return {
          id: court.id,
          name: court.court_name,
          isAvailable: !activeBooking,
          currentBookingId: activeBooking?.id,
          bookingEndTime: activeBooking?.end_time,
          matchType: activeBooking?.booking_type === 'GUEST' ? 'Khách vãng lai' : 'Khách cố định',
        };
      });
      setCourtStatuses(mappedStatuses);

      // 3. Fetch Overview Metrics (Today's Revenue & Occupancy Heuristic)
      // Note: This is an approximation for the demo. In a real app, you'd aggregate this securely.
      const { data: todayInvoices } = await supabase
        .from("invoices")
        .select("total_amount")
        .eq("is_paid", true)
        .gte("created_at", todayStartStr);

      const todayRevenue = todayInvoices?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;

      // Occupancy heuristic: (Active Courts / Total Courts) * 100
      const activeCount = mappedStatuses.filter(s => !s.isAvailable).length;
      const totalCourts = mappedStatuses.length || 1; // prevent div by zero
      const occupancy = Math.round((activeCount / totalCourts) * 100);

      // Simple mock for revenue change% 
      setMetrics({
        totalRevenue: todayRevenue,
        revenueStatus: "up",
        revenueChangePercent: 12, // Placeholder
        occupancyRate: occupancy,
      });

    } catch (err) {
      console.error("Error fetching home data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingClick = (/* courtId: string */) => {
    // Open the new booking modal with the specific court selected
    // Note: The BookingForm might need adjustments to pre-select a court effectively if it doesn't already
    setIsBookingOpen(true);
  };

  const handleViewBookingClick = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setIsBookingDetailsOpen(true);
  };

  const handleRefresh = () => {
    fetchHomeData();
    window.dispatchEvent(new Event('booking_updated'));
  };

  // Add listener for external updates (like if someone completes a checkout in another tab/component)
  useEffect(() => {
    const handleUpdate = () => fetchHomeData();
    window.addEventListener('booking_updated', handleUpdate);
    return () => window.removeEventListener('booking_updated', handleUpdate);
  }, []);

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display min-h-screen selection:bg-emerald-500 selection:text-white">
      <div className="relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden md:max-w-md md:mx-auto md:shadow-2xl md:border-x border-slate-200 dark:border-slate-800 bg-background-light dark:bg-background-dark">

        {/* Sticky App Header */}
        <StickyHeader notificationCount={1} />

        {/* Main Scrollable Content */}
        <div className="flex-1 flex flex-col gap-6 p-4 overflow-y-auto no-scrollbar pb-32">

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
          ) : (
            <>
              {/* Court Status */}
              <CourtStatusSection
                courts={courtStatuses}
                onBookClick={handleBookingClick}
                onViewBookingClick={handleViewBookingClick}
              />

              {/* Quick Actions */}
              <QuickActionsSection onNewBookingClick={() => setIsBookingOpen(true)} />

              {/* Overview Metrics */}
              <OverviewMetricsSection {...metrics} />
            </>
          )}

        </div>

        {/* Reusing existing Dialogs from the old page */}
        <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
          <DialogContent className="p-0 sm:max-w-[480px] h-full sm:h-auto overflow-hidden border-none bg-transparent shadow-none">
            <BookingForm
              selectedDate={new Date()}
              selectedCourtId={courts[0]?.id || null}
              courts={courts}
              onSuccess={() => {
                setIsBookingOpen(false);
                handleRefresh();
              }}
              onCancel={() => setIsBookingOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isBookingDetailsOpen} onOpenChange={setIsBookingDetailsOpen}>
          <DialogContent className="p-0 sm:max-w-[480px] h-full sm:h-auto overflow-hidden border-none bg-transparent shadow-none">
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

        {/* Global Bottom Nav (Desktop Sidebar nav handles desktop views) */}
        <BottomNav />

        {/* Specific styles for the mobile app feel */}
        <style jsx global>{`
          .no-scrollbar::-webkit-scrollbar {
              display: none;
          }
          .no-scrollbar {
              -ms-overflow-style: none; /* IE and Edge */
              scrollbar-width: none; /* Firefox */
          }
        `}</style>
      </div>
    </div>
  );
}
