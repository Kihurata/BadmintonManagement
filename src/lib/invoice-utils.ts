import { format } from 'date-fns';
import { formatCurrency } from './utils';

// 1. Tạo URL VietQR dùng chung
export function generateVietQrUrl(amount: number, description: string): string {
    const BANK_ID = 'tpbank';
    const ACCOUNT_NO = '07119136101';
    const ACCOUNT_NAME = 'TRAN MINH QUAN';
    
    return `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.jpg?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;
}

// 2. Định dạng văn bản chia sẻ hóa đơn (Zalo/Messenger)
interface ShareInvoiceData {
    customerName: string;
    isQuickSale: boolean;
    courtName?: string;
    startTime?: string | Date;
    endTime?: string | Date;
    rentalFee: number;
    overtimeFee: number;
    itemsFee: number;
    deposit: number;
    totalAmount: number;
    isPaid: boolean;
    paymentMethod?: string;
    items: Array<{ name: string; quantity: number; price: number; unit?: string }>;
}

export function formatInvoiceShareText(data: ShareInvoiceData): string {
    let text = `🏸 HOÁ ĐƠN ${data.isQuickSale ? 'BÁN LẺ' : 'SÂN CẦU LÔNG'}\n`;
    text += `👤 Khách: ${data.customerName || 'Khách lẻ'}\n`;

    if (!data.isQuickSale && data.startTime && data.endTime) {
        const date = format(new Date(data.startTime), 'dd/MM/yyyy');
        const startTimeStr = format(new Date(data.startTime), 'HH:mm');
        const endTimeStr = format(new Date(data.endTime), 'HH:mm');

        text += `🏟 Sân: ${data.courtName || '---'}\n`;
        text += `📅 Ngày: ${date}\n`;
        text += `⏰ Giờ: ${startTimeStr} - ${endTimeStr}\n`;
    } else {
        text += `📅 Ngày: ${format(new Date(), 'dd/MM/yyyy HH:mm')}\n`;
    }

    text += `----------------------\n`;

    if (!data.isQuickSale) {
        text += `💰 Tiền sân: ${formatCurrency(data.rentalFee)}\n`;
        if (data.overtimeFee > 0) text += `⏳ Quá giờ/Phụ phí: ${formatCurrency(data.overtimeFee)}\n`;
    }
    
    if (data.itemsFee > 0) {
        text += `🥤 Dịch vụ:\n`;
        data.items.forEach(item => {
            text += `  + ${item.name} x${item.quantity}: ${formatCurrency(item.price * item.quantity)}\n`;
        });
    }
    
    if (data.deposit > 0) text += `💵 Đã cọc: -${formatCurrency(data.deposit)}\n`;

    text += `----------------------\n`;
    text += `💳 TỔNG CỘNG: ${formatCurrency(data.totalAmount)}\n`;
    text += `Trạng thái: ${data.isPaid ? `✅ Đã thanh toán (${data.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'})` : '⏳ Chưa thanh toán'}`;

    return text;
}

export interface FormatSplitZaloData {
    courtName?: string;
    startTime?: string | Date;
    endTime?: string | Date;
    courtFee: number;
    splitDetails: {
        attendees: Array<{
            member_name: string;
            shared_share: number;
            individual_total: number;
            total_due: number;
            is_paid: boolean;
            group_member_id: string;
        }>;
        items: Array<{
            product_name: string;
            quantity: number;
            sale_price: number;
            allocation_type: 'SHARED' | 'INDIVIDUAL' | null;
            assigned_member_id: string | null;
        }>;
        summary: {
            shared_pool_total: number;
            per_person_shared: number;
            total_invoice_amount: number;
            attendee_count: number;
        };
    };
    bankAccountNo?: string;
    bankName?: string;
    accountName?: string;
}

export function formatSplitBreakdownZaloText(data: FormatSplitZaloData): string {
    const { courtName, startTime, endTime, courtFee, splitDetails } = data;
    const dateStr = startTime ? format(new Date(startTime), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy');
    const timeStr = startTime && endTime 
        ? `${format(new Date(startTime), 'HH:mm')} - ${format(new Date(endTime), 'HH:mm')}`
        : '';

    let text = `🏸 BẢNG CHIA TIỀN SÂN - ${courtName || 'CẦU LÔNG'}\n`;
    text += `📅 Ngày: ${dateStr} ${timeStr ? `(${timeStr})` : ''}\n`;
    text += `👥 Số người tham gia: ${splitDetails.summary.attendee_count} người\n`;
    text += `---------------------------------\n`;
    text += `💰 CHI PHÍ CHUNG (CẢ SÂN):\n`;
    text += `• Tiền giờ sân: ${formatCurrency(courtFee)}\n`;

    const sharedItems = splitDetails.items.filter(i => i.allocation_type === 'SHARED');
    if (sharedItems.length > 0) {
        sharedItems.forEach(i => {
            text += `• ${i.product_name} x${i.quantity}: ${formatCurrency(i.sale_price * i.quantity)}\n`;
        });
    }

    text += `👉 Tổng chi phí chung: ${formatCurrency(splitDetails.summary.shared_pool_total)}\n`;
    text += `👉 Mỗi người chia đều: ${formatCurrency(splitDetails.summary.per_person_shared)}\n`;
    text += `---------------------------------\n`;
    text += `👤 CHI TIẾT TỪNG THÀNH VIÊN:\n`;

    splitDetails.attendees.forEach((att, idx) => {
        const indItems = splitDetails.items.filter(i => i.assigned_member_id === att.group_member_id);
        const status = att.is_paid ? ' (Đã trả)' : '';
        text += `${idx + 1}. ${att.member_name}: ${formatCurrency(att.total_due)}${status}\n`;
        if (indItems.length > 0) {
            const indStr = indItems.map(i => `${i.product_name} x${i.quantity}`).join(', ');
            text += `   (Tiền sân: ${formatCurrency(att.shared_share)} + Đồ riêng: ${indStr})\n`;
        }
    });

    text += `---------------------------------\n`;
    text += `💳 TỔNG HÓA ĐƠN: ${formatCurrency(splitDetails.summary.total_invoice_amount)}\n`;
    text += `🏦 STK Chuyển khoản:\n`;
    text += `• Ngân hàng: ${data.bankName || 'TPBank'}\n`;
    text += `• STK: ${data.bankAccountNo || '07119136101'}\n`;
    text += `• Chủ TK: ${data.accountName || 'TRAN MINH QUAN'}\n`;
    text += `Cảm ơn mọi người! Chúc buổi chơi vui vẻ! 🏸`;

    return text;
}
