export interface Product {
    id: string;
    product_name: string;
    base_unit: string;
    unit?: string; // Legacy field
    unit_price: number;
    current_sale_price?: number; // Legacy field
    stock_quantity: number;
    is_packable: boolean;
    pack_unit: string | null;
    units_per_pack: number | null;
    pack_price: number | null;
}

export interface Customer {
    name: string;
    phone: string | null;
}

export interface Court {
    court_name: string;
    morning_price_loyal?: number;
    morning_price_guest?: number;
    evening_price_loyal?: number;
    evening_price_guest?: number;
}

export interface Booking {
    start_time: string;
    end_time: string;
    courts?: Court;
}

export interface InvoiceItem {
    id: string;
    invoice_id: string;
    product_id: string;
    quantity: number;
    sale_price: number;
    products?: {
        product_name: string;
        base_unit: string;
    };
}

export interface Invoice {
    id: string;
    created_at: string;
    total_amount: number;
    is_paid: boolean;
    payment_method: 'CASH' | 'BANK_TRANSFER' | null;
    customers?: Customer;
    bookings?: Booking;
}
