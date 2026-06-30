import { useState, useEffect } from 'react';
import { PaymentSelector } from '@/components/invoices/payment-selector';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatCurrency } from '@/lib/utils';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { ProductSelectorList, type ProductSelectorItem } from './product-selector-list';
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

interface CartItem {
    id: string; // generated locally
    productItem: ProductSelectorItem;
    quantity: number;
}

export function QuickSaleForm({ onSuccess, onCancel }: QuickSaleFormProps) {
    // Customers State
    const [customers, setCustomers] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [customerId, setCustomerId] = useState('');
    const [customerOpen, setCustomerOpen] = useState(false);

    // Products & Cart State
    const [products, setProducts] = useState<ProductSelectorItem[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);

    // Payment State
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            // Fetch Customers
            const custRes = await fetch('/api/customers');
            const custData = await custRes.json();
            if (custRes.ok && custData.success) {
                setCustomers(custData.data);
            }

            // Fetch Products
            const prodRes = await fetch('/api/v1/products');
            const prodData = await prodRes.json();
            if (prodRes.ok && prodData.success) {
                const processedProducts: ProductSelectorItem[] = [];
                prodData.data.forEach((p: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
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

    const handleUpdateQuantity = (product: ProductSelectorItem, delta: number) => {
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
            const formattedCartItems = cart.map(item => ({
                productId: item.productItem.productId,
                quantity: item.quantity,
                price: item.productItem.price,
                isPack: item.productItem.isPack
            }));

            const response = await fetch('/api/quick-sale', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customerId: customerId || null,
                    totalAmount,
                    paymentMethod,
                    cartItems: formattedCartItems
                })
            });

            const resData = await response.json();
            if (!response.ok || !resData.success) {
                throw new Error(resData.error || 'Có lỗi xảy ra trong quá trình thanh toán.');
            }

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

    const cartQuantities = Object.fromEntries(cart.map(item => [item.productItem.key, item.quantity]));

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
                    <ProductSelectorList
                        products={products}
                        quantities={cartQuantities}
                        onAdd={(p) => handleUpdateQuantity(p, 1)}
                        onUpdateQuantity={(p, delta) => handleUpdateQuantity(p, delta)}
                        loading={loading}
                    />
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

                {/* Payment Selector */}
                <PaymentSelector
                    totalAmount={totalAmount}
                    qrDescription="Thanh toan mua le"
                    paymentMethod={paymentMethod}
                    onChangePaymentMethod={setPaymentMethod}
                />
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
