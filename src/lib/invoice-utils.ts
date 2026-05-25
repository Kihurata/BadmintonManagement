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
