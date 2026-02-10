
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CustomerFormProps {
    customerToEdit?: any;
    onSuccess: () => void;
    onCancel: () => void;
}

export function CustomerForm({ customerToEdit, onSuccess, onCancel }: CustomerFormProps) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [type, setType] = useState('GUEST');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (customerToEdit) {
            setName(customerToEdit.name);
            setPhone(customerToEdit.phone || '');
            setType(customerToEdit.type || 'GUEST');
        }
    }, [customerToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const customerData = {
            name: name,
            phone: phone || null,
            type: type
        };

        let error;

        if (customerToEdit) {
            const { error: updateError } = await supabase
                .from('customers')
                .update(customerData)
                .eq('id', customerToEdit.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('customers')
                .insert([customerData]);
            error = insertError;
        }

        setLoading(false);

        if (error) {
            setError(error.message);
        } else {
            onSuccess();
        }
    };

    return (
        <div className="bg-white dark:bg-[#0d1b17] w-full max-w-md mx-auto rounded-lg overflow-hidden flex flex-col h-full max-h-[90vh]">
            <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-white/10">
                <DialogTitle className="text-xl font-bold text-center">
                    {customerToEdit ? 'Sửa Khách Hàng' : 'Thêm Khách Hàng Mới'}
                </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                {error && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="name">Tên khách hàng</Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Văn A"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">Số điện thoại</Label>
                    <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="09xx..."
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="type">Loại khách</Label>
                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="GUEST">Vãng lai</SelectItem>
                            <SelectItem value="LOYAL">Thân thiết (VIP)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </form>

            <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={onCancel}>Hủy</Button>
                <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                    Lưu
                </Button>
            </div>
        </div>
    );
}
