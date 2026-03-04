import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatCurrency } from '@/lib/utils';
import { Check, ChevronsUpDown, Loader2, Plus, Minus } from 'lucide-react';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

interface QuickSaleFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

interface ProductItem {
    key: string;
    productId: string;
    name: string;
    unit: string;
    price: number;
    isPack: boolean;
    deduct: number;
}

interface CartItem {
    id: string; // generated locally
    productItem: ProductItem;
    quantity: number;
}

export function QuickSaleForm({ onSuccess, onCancel }: QuickSaleFormProps) {
    // Customers State
    const [customers, setCustomers] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [customerId, setCustomerId] = useState('');
    const [customerOpen, setCustomerOpen] = useState(false);

    // Products & Cart State
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);

    // Payment State
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            // Fetch Customers
            const { data: customersData } = await supabase.from('customers').select('*').order('name');
            if (customersData) setCustomers(customersData);

            // Fetch Products
            const { data: prodData } = await supabase
                .from('products')
                .select('*')
                .gt('stock_quantity', 0)
                .order('product_name');

            if (prodData) {
                const processedProducts: ProductItem[] = [];
                prodData.forEach((p: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                    // Base Unit
                    processedProducts.push({
                        key: `${p.id}-base`,
                        productId: p.id,
                        name: p.product_name,
                        unit: p.base_unit || 'Cái',
                        price: p.unit_price,
                        isPack: false,
                        deduct: 1
                    });
                    // Pack Unit
                    if (p.is_packable && p.pack_unit) {
                        const packPrice = p.pack_price || (p.unit_price * p.units_per_pack);
                        processedProducts.push({
                            key: `${p.id}-pack`,
                            productId: p.id,
                            name: `${p.product_name} (${p.pack_unit})`,
                            unit: p.pack_unit,
                            price: packPrice,
                            isPack: true,
                            deduct: p.units_per_pack
                        });
                    }
                });
                setProducts(processedProducts);
            }
        };
        fetchData();
    }, []);

    const handleUpdateQuantity = (product: ProductItem, delta: number) => {
        setCart((prev) => {
            const existing = prev.find(item => item.productItem.key === product.key);
            if (!existing) {
                if (delta > 0) {
                    return [...prev, { id: 'local-' + Date.now(), productItem: product, quantity: delta }];
                }
                return prev;
            }

            const newQuantity = existing.quantity + delta;
            if (newQuantity <= 0) {
                return prev.filter(item => item.productItem.key !== product.key);
            }

            return prev.map(item =>
                item.productItem.key === product.key
                    ? { ...item, quantity: newQuantity }
                    : item
            );
        });
    };

    const totalAmount = cart.reduce((sum, item) => sum + (item.productItem.price * item.quantity), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (cart.length === 0) {
            setError('Giỏ hàng trống. Vui lòng chọn sản phẩm.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Resolve Customer ID
            let finalCustomerId = customerId;
            if (!finalCustomerId) {
                // Find or Create "Khách vãng lai"
                const { data: guest } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('name', 'Khách vãng lai')
                    .single();

                if (guest) {
                    finalCustomerId = guest.id;
                } else {
                    const { data: newGuest, error: createError } = await supabase
                        .from('customers')
                        .insert([{ name: 'Khách vãng lai', type: 'GUEST' }])
                        .select()
                        .single();

                    if (createError || !newGuest) {
                        throw new Error('Không thể tạo khách vãng lai mặc định');
                    }
                    finalCustomerId = newGuest.id;
                }
            }

            // 2. Create Invoice
            const { data: newInvoice, error: invoiceError } = await supabase
                .from('invoices')
                .insert([{
                    booking_id: null,
                    customer_id: finalCustomerId,
                    total_amount: totalAmount,
                    payment_method: paymentMethod,
                    is_paid: true
                }])
                .select()
                .single();

            if (invoiceError || !newInvoice) {
                throw new Error('Lỗi tạo hóa đơn: ' + invoiceError?.message);
            }

            // 3. Create Invoice Items
            const itemsToInsert = cart.map(item => ({
                invoice_id: newInvoice.id,
                product_id: item.productItem.productId,
                quantity: item.quantity,
                sale_price: item.productItem.price,
                is_pack_sold: item.productItem.isPack
            }));

            const { error: itemsError } = await supabase
                .from('invoice_items')
                .insert(itemsToInsert);

            if (itemsError) {
                // Not ideal to fail halfway, but for quick sale it is mostly okay
                throw new Error('Lỗi thêm chi tiết món hàng: ' + itemsError.message);
            }

            // Note: Triggers in DB will handle the inventory deduction automatically.

            setSuccessMessage("Bán hàng thành công!");

            // Wait a brief moment to show success message, then close
            setTimeout(() => {
                onSuccess();
            }, 1000);

        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                setError(err.message || 'Có lỗi xảy ra trong quá trình thanh toán.');
            } else {
                setError('Có lỗi xảy ra trong quá trình thanh toán.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (successMessage) {
        return (
            <div className="bg-white dark:bg-[#0d1b17] w-full max-w-md mx-auto rounded-lg overflow-hidden flex flex-col items-center justify-center h-64">
                <div className="size-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-4xl text-emerald-600">check_circle</span>
                </div>
                <h3 className="text-xl font-bold text-center text-emerald-600">{successMessage}</h3>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#0d1b17] w-full max-w-md mx-auto rounded-lg overflow-hidden flex flex-col h-full max-h-[90vh]">
            <div className="flex shrink-0 items-center px-4 pt-6 pb-4 border-b border-gray-100 dark:border-white/10">
                <button onClick={onCancel} className="text-black dark:text-gray-200 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <span className="material-symbols-outlined text-2xl font-bold">arrow_back</span>
                </button>
                <h2 className="text-black dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
                    Bán hàng lẻ
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-6">
                {error && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {/* Customer Selector */}
                <div className="space-y-2 flex flex-col">
                    <Label className="text-xs uppercase font-bold text-gray-500">Khách hàng</Label>
                    <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={customerOpen}
                                className="w-full justify-between font-normal bg-gray-50 dark:bg-gray-800 border-none h-12"
                            >
                                {customerId
                                    ? customers.find((c) => c.id === customerId)?.name
                                    : "Chọn khách hàng (Mặc định: Vãng lai)"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-xl border-0">
                            <Command>
                                <CommandInput placeholder="Tìm tên hoặc SĐT..." />
                                <CommandList>
                                    <CommandEmpty>Không tìm thấy.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem
                                            value="Khách vãng lai"
                                            onSelect={() => {
                                                setCustomerId("");
                                                setCustomerOpen(false);
                                            }}
                                            className="font-medium"
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    customerId === "" ? "opacity-100 text-emerald-600" : "opacity-0"
                                                )}
                                            />
                                            Khách vãng lai (Mặc định)
                                        </CommandItem>
                                        {customers.map((customer) => (
                                            <CommandItem
                                                key={customer.id}
                                                value={customer.name}
                                                onSelect={() => {
                                                    setCustomerId(customer.id === customerId ? "" : customer.id);
                                                    setCustomerOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4 text-emerald-600",
                                                        customerId === customer.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {customer.name} {customer.phone ? `(${customer.phone})` : ''} - {customer.type === 'LOYAL' ? 'Thân thiết' : 'Vãng lai'}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Products List */}
                <div className="space-y-3">
                    <Label className="text-xs uppercase font-bold text-gray-500">Sản phẩm / Dịch vụ</Label>

                    {products.length === 0 ? (
                        <div className="text-center py-4 text-sm text-gray-500">Không có sản phẩm nào trong kho.</div>
                    ) : (
                        <div className="space-y-3">
                            {products.map(product => {
                                const cartItem = cart.find(i => i.productItem.key === product.key);
                                const quantity = cartItem ? cartItem.quantity : 0;

                                return (
                                    <div key={product.key} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-3 rounded-xl flex justify-between items-center shadow-sm">
                                        <div>
                                            <div className="font-bold text-midnight dark:text-gray-100">{product.name}</div>
                                            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                                {formatCurrency(product.price)} / {product.unit}
                                            </div>
                                        </div>

                                        {quantity === 0 ? (
                                            <Button
                                                size="sm"
                                                className="bg-emerald-50 dark:bg-emerald-900/40 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg shadow-none"
                                                onClick={() => handleUpdateQuantity(product, 1)}
                                                disabled={loading}
                                            >
                                                <Plus className="size-4 mr-1" /> Thêm
                                            </Button>
                                        ) : (
                                            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                                                <button
                                                    onClick={() => handleUpdateQuantity(product, -1)}
                                                    className="size-8 flex items-center justify-center bg-white dark:bg-gray-700 rounded-md shadow-sm text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors"
                                                    disabled={loading}
                                                >
                                                    <Minus className="size-4" />
                                                </button>
                                                <span className="w-8 text-center font-bold text-lg text-midnight dark:text-white">{quantity}</span>
                                                <button
                                                    onClick={() => handleUpdateQuantity(product, 1)}
                                                    className="size-8 flex items-center justify-center bg-emerald-600 rounded-md shadow-sm text-white hover:bg-emerald-700 transition-colors"
                                                    disabled={loading}
                                                >
                                                    <Plus className="size-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Invoice Summary */}
                {cart.length > 0 && (
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/30">
                        <div className="flex justify-between items-end">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Tổng cộng</span>
                            <span className="text-2xl font-extrabold text-blue-700 dark:text-blue-400">{formatCurrency(totalAmount)}</span>
                        </div>
                    </div>
                )}

                {/* Payment Method */}
                <div className="pt-2">
                    <p className="text-black text-[10px] font-bold uppercase tracking-widest mb-3 ml-1">Phương thức thanh toán</p>
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <label className="flex-1 cursor-pointer">
                            <input
                                type="radio"
                                name="payment_method"
                                value="CASH"
                                checked={paymentMethod === 'CASH'}
                                onChange={() => setPaymentMethod('CASH')}
                                className="peer sr-only"
                            />
                            <div className="flex items-center justify-center gap-2 py-3 rounded-xl text-gray-500 dark:text-gray-400 transition-all peer-checked:bg-white dark:peer-checked:bg-gray-700 peer-checked:text-emerald-600 peer-checked:shadow-sm">
                                <span className="material-symbols-outlined text-lg">payments</span>
                                <span className="text-sm font-bold">Tiền mặt</span>
                            </div>
                        </label>
                        <label className="flex-1 cursor-pointer">
                            <input
                                type="radio"
                                name="payment_method"
                                value="BANK_TRANSFER"
                                checked={paymentMethod === 'BANK_TRANSFER'}
                                onChange={() => setPaymentMethod('BANK_TRANSFER')}
                                className="peer sr-only"
                            />
                            <div className="flex items-center justify-center gap-2 py-3 rounded-xl text-gray-500 dark:text-gray-400 transition-all peer-checked:bg-white dark:peer-checked:bg-gray-700 peer-checked:text-emerald-600 peer-checked:shadow-sm">
                                <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                                <span className="text-sm font-bold">Chuyển khoản</span>
                            </div>
                        </label>
                    </div>

                    {/* QR Code Display */}
                    {paymentMethod === 'BANK_TRANSFER' && totalAmount > 0 && (
                        <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative w-[332px] h-[332px] mx-auto max-w-full">
                                <Image
                                    src={`https://img.vietqr.io/image/tpbank-07119136101-compact2.jpg?amount=${totalAmount}&addInfo=${encodeURIComponent(`Thanh toan mua le`)}&accountName=TRAN MINH QUAN`}
                                    alt="QR Code Thanh Toán"
                                    fill
                                    className="object-contain rounded-lg"
                                    unoptimized
                                    sizes="332px"
                                />
                            </div>
                            <p className="mt-3 text-[11px] text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full font-medium">
                                Số tiền: {formatCurrency(totalAmount)}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Button */}
            <div className="shrink-0 w-full bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4 z-30">
                <Button
                    onClick={handleSubmit}
                    disabled={loading || cart.length === 0}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-lg font-bold rounded-xl shadow-lg shadow-emerald-600/20"
                >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : (
                        <span className="material-symbols-outlined mr-2">point_of_sale</span>
                    )}
                    Hoàn tất thanh toán
                </Button>
            </div>
        </div>
    );
}
