'use client';

import { useState } from 'react';
import { startOfToday } from 'date-fns';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { StickyHeader } from '@/components/home/sticky-header';
import { DateSelector } from '@/components/booking/schedule/date-selector';
import { Timeline } from '@/components/booking/schedule/timeline';
import {
  Dialog,
  DialogContent,
  DialogTitle
} from "@/components/ui/dialog"
import { CheckoutForm } from '@/components/booking/checkout-form';
import { BookingForm } from '@/components/booking/booking-form';
import { BookingDetails } from '@/components/booking/booking-details';

interface ScheduleClientProps {
  initialCourts: { id: string; court_name: string }[];
}

export default function ScheduleClient({ initialCourts }: ScheduleClientProps) {
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [courts] = useState(initialCourts);

  // Dialog States
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isBookingDetailsOpen, setIsBookingDetailsOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const handleBookingClick = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setIsBookingDetailsOpen(true);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-sans text-midnight dark:text-gray-100 min-h-screen flex flex-col overflow-hidden w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col md:pl-64 transition-all overflow-hidden relative h-screen">
        {/* Header */}
        <div className="md:hidden">
          <StickyHeader title="Lịch Đặt Sân" />
        </div>

        {/* Date Picker */}
        <div className="bg-background-light dark:bg-background-dark z-10 sticky top-[73px] md:top-0 border-b border-slate-200 dark:border-slate-800">
          <DateSelector selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        </div>

        {/* Timeline Scroll Area */}
        {courts.length > 0 ? (
          <Timeline
            selectedDate={selectedDate}
            courts={courts}
            onBookingClick={handleBookingClick}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="size-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4 text-emerald-600">
              <span className="material-symbols-outlined text-4xl">domain_add</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Chưa có dữ liệu Sân</h2>
            <p className="text-gray-500 mb-6 text-center max-w-sm">
              Chào mừng bạn đến với hệ thống quản lý. Vui lòng thiết lập cấu hình sân cơ bản để bắt đầu sử dụng.
            </p>
            <a href="/onboarding" className="inline-flex h-12 items-center justify-center rounded-md bg-emerald-600 px-8 text-sm font-medium text-white shadow transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-700">
              Bắt đầu Thiết lập
            </a>
          </div>
        )}

        {/* Booking Dialog */}
        <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
          <DialogContent className="p-0 sm:max-w-[480px] h-full sm:h-auto overflow-hidden border-none bg-transparent shadow-none">
            <DialogTitle className="sr-only">Đặt sân</DialogTitle>
            <BookingForm
              selectedDate={selectedDate}
              selectedCourtId={courts[0]?.id || null}
              courts={courts}
              onSuccess={() => {
                setIsBookingOpen(false);
                window.dispatchEvent(new Event('booking_updated'));
              }}
              onCancel={() => setIsBookingOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Booking Details Dialog */}
        <Dialog open={isBookingDetailsOpen} onOpenChange={setIsBookingDetailsOpen}>
          <DialogContent className="p-0 sm:max-w-[480px] h-full sm:h-auto overflow-hidden border-none bg-transparent shadow-none">
            <DialogTitle className="sr-only">Chi tiết đặt sân</DialogTitle>
            {selectedBookingId && (
              <BookingDetails
                bookingId={selectedBookingId}
                onClose={() => setIsBookingDetailsOpen(false)}
                onCheckInSuccess={() => {
                  setIsBookingDetailsOpen(false);
                  window.dispatchEvent(new Event('booking_updated'));
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
            <DialogTitle className="sr-only">Thanh toán</DialogTitle>
            {selectedBookingId && (
              <CheckoutForm
                bookingId={selectedBookingId}
                onSuccess={() => {
                  setIsCheckoutOpen(false);
                  window.dispatchEvent(new Event('booking_updated'));
                }}
                onCancel={() => setIsCheckoutOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Floating Action Button (FAB) */}
        <div className="absolute bottom-20 md:bottom-6 right-4 md:right-6 z-40">
          <button
            onClick={() => setIsBookingOpen(true)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 hover:bg-primary-dark active:scale-90 transition-all"
          >
            <span className="material-symbols-outlined text-3xl">add</span>
          </button>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex-none z-50">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
