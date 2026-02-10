
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Loader2 } from 'lucide-react';

interface BookingDetailsProps {
    bookingId: string;
    onClose: () => void;
    onCheckInSuccess: () => void;
    onCheckOutClick?: () => void;
}

export function BookingDetails({ bookingId, onClose, onCheckInSuccess, onCheckOutClick }: BookingDetailsProps) {
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        async function fetchBooking() {
            setLoading(true);
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    customers ( name, phone, type ),
                    courts ( court_name )
                `)
                .eq('id', bookingId)
                .single();

            if (data) {
                setBooking(data);
            }
            setLoading(false);
        }
        fetchBooking();
    }, [bookingId]);

    const handleCheckIn = async () => {
        setActionLoading(true);
        const { error } = await supabase
            .from('bookings')
            .update({ status: 'CHECKED_IN' })
            .eq('id', bookingId);

        setActionLoading(false);
        if (!error) {
            onCheckInSuccess();
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    if (!booking) {
        return <div className="p-4 text-center">Booking not found</div>;
    }

    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);

    return (
        <div className="bg-white dark:bg-[#0d1b17] w-full max-w-md mx-auto rounded-lg overflow-hidden flex flex-col h-full max-h-[90vh]">
            <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-white/10">
                <DialogTitle className="text-xl font-bold text-center">Chi tiết đặt sân</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Court & Time */}
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl text-center">
                    <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mb-1">{booking.courts?.court_name}</h3>
                    <div className="text-2xl font-bold text-midnight dark:text-white">
                        {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {format(startTime, 'dd/MM/yyyy')}
                    </div>
                </div>

                {/* Customer Info */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Thông tin khách hàng</h4>

                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-600">
                            {booking.customers?.name?.charAt(0) || 'K'}
                        </div>
                        <div>
                            <div className="font-bold text-lg">{booking.customers?.name}</div>
                            <div className="text-gray-500 text-sm">{booking.customers?.phone}</div>
                        </div>
                        <div className="ml-auto">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${booking.customers?.type === 'LOYAL'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                {booking.customers?.type === 'LOYAL' ? 'THÂN THIẾT' : 'VÃNG LAI'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</h4>
                    <div className={`p-3 rounded-lg font-bold text-center ${booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                            booking.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                                booking.status === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-700' :
                                    booking.status === 'COMPLETED' ? 'bg-gray-100 text-gray-700' :
                                        'bg-red-100 text-red-700'
                        }`}>
                        {booking.status === 'PENDING' ? 'CHỜ XÁC NHẬN' :
                            booking.status === 'CONFIRMED' ? 'ĐÃ ĐẶT LỊCH' :
                                booking.status === 'CHECKED_IN' ? 'ĐANG SỬ DỤNG' :
                                    booking.status === 'COMPLETED' ? 'HOÀN THÀNH' :
                                        'ĐÃ HỦY'}
                    </div>
                </div>

                {/* Notes */}
                {booking.note && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Ghi chú</h4>
                        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg text-sm">
                            {booking.note}
                        </div>
                    </div>
                )}
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                {(booking.status === 'CONFIRMED' || booking.status === 'PENDING') && (
                    <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-lg font-bold rounded-xl shadow-lg shadow-emerald-600/20"
                        onClick={handleCheckIn}
                        disabled={actionLoading}
                    >
                        {actionLoading ? <Loader2 className="animate-spin mr-2" /> : <span className="material-symbols-outlined mr-2">login</span>}
                        Check In (Nhận Sân)
                    </Button>
                )}

                {booking.status === 'CHECKED_IN' && (
                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-bold rounded-xl shadow-lg shadow-blue-600/20 mb-3"
                        onClick={onCheckOutClick}
                    >
                        <span className="material-symbols-outlined mr-2">shopping_cart_checkout</span>
                        Thanh toán & Trả sân
                    </Button>
                )}

                <Button variant="ghost" className="w-full mt-2" onClick={onClose}>Đóng</Button>
            </div>
        </div>
    );
}
