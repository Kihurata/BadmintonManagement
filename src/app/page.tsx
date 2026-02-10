
'use client';

import { useState, useEffect } from 'react';
import { startOfToday } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { BottomNav } from '@/components/layout/bottom-nav';
import { DateSelector } from '@/components/booking/schedule/date-selector';
import { Timeline } from '@/components/booking/schedule/timeline';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { CheckoutForm } from '@/components/booking/checkout-form';
import { BookingForm } from '@/components/booking/booking-form';
import { BookingDetails } from '@/components/booking/booking-details';


export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [courts, setCourts] = useState<any[]>([]);

  // Dialog States
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isBookingDetailsOpen, setIsBookingDetailsOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourts() {
      const { data } = await supabase.from('courts').select('id, court_name').order('court_name');
      if (data && data.length > 0) {
        setCourts(data);
      }
    }
    fetchCourts();
  }, []);

  const handleBookingClick = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setIsBookingDetailsOpen(true);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-sans text-midnight dark:text-gray-100 overflow-hidden h-screen flex flex-col w-full">
      {/* Header */}
      <header className="flex-none bg-background-light dark:bg-background-dark pt-safe-top z-10 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between px-4 py-3">
          <button className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all text-midnight dark:text-white">
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h1 className="text-lg font-bold leading-tight tracking-tight text-center flex-1">Lịch Đặt Sân</h1>
          <button className="flex size-10 items-center justify-center rounded-full overflow-hidden border border-transparent hover:border-gray-200 dark:hover:border-white/10">
            <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-white font-bold">A</div>
          </button>
        </div>

        {/* Date Picker */}
        <DateSelector selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      </header>

      {/* Timeline Scroll Area */}
      {courts.length > 0 && (
        <Timeline
          selectedDate={selectedDate}
          courts={courts}
          onBookingClick={handleBookingClick}
        />
      )}

      {/* Booking Dialog */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="p-0 sm:max-w-[480px] h-full sm:h-auto overflow-hidden border-none bg-transparent shadow-none">
          <BookingForm
            selectedDate={selectedDate}
            selectedCourtId={courts[0]?.id || null} // Default to first court for now
            courts={courts}
            onSuccess={() => {
              setIsBookingOpen(false);
              window.location.reload();
            }}
            onCancel={() => setIsBookingOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Booking Details Dialog */}
      <Dialog open={isBookingDetailsOpen} onOpenChange={setIsBookingDetailsOpen}>
        <DialogContent className="p-0 sm:max-w-[480px] h-full sm:h-auto overflow-hidden border-none bg-transparent shadow-none">
          {selectedBookingId && (
            <BookingDetails
              bookingId={selectedBookingId}
              onClose={() => setIsBookingDetailsOpen(false)}
              onCheckInSuccess={() => {
                setIsBookingDetailsOpen(false);
                window.location.reload();
              }}
              onCheckOutClick={() => {
                setIsBookingDetailsOpen(false);
                setIsCheckoutOpen(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="p-0 sm:max-w-[480px] h-full sm:h-auto overflow-hidden border-none bg-transparent shadow-none">
          {selectedBookingId && (
            <CheckoutForm
              bookingId={selectedBookingId}
              onSuccess={() => {
                setIsCheckoutOpen(false);
                window.location.reload();
              }}
              onCancel={() => setIsCheckoutOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Floating Action Button (FAB) */}
      <div className="absolute bottom-20 right-4 z-40">
        <button
          onClick={() => setIsBookingOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 hover:bg-primary-dark active:scale-90 transition-all"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
      {/* Styles */}
      <style jsx global>{`
        .pt-safe-top {
            padding-top: env(safe-area-inset-top, 0px);
        }
        .pb-safe-bottom {
            padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
