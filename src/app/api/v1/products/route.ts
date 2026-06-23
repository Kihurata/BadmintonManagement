import { NextRequest, NextResponse } from "next/server";
import { getProducts, createProduct } from "@/server/repositories/product-repo";
import { verifyUserRole } from "@/lib/api-auth";
import z from 'zod';

const productSchema = z.object({
    product_name: z.string().trim().min(1, "Tên sản phẩm không được để trống"),
    unit_price: z.number().positive("Giá sản phẩm phải lớn hơn 0"),
    stock_quantity: z.number().int().nonnegative("Số lượng tồn kho phải là số nguyên không âm"),
    base_unit: z.string().nullable().optional(),
    is_packable: z.boolean().optional(),
    pack_unit: z.string().nullable().optional(),
    units_per_pack: z.number().int().positive("Số lượng sản phẩm mỗi gói phải là số nguyên dương").nullable().optional(),
    pack_price: z.number().positive("Giá mỗi gói phải lớn hơn 0").nullable().optional(),
});

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const onlyAvailable = searchParams.get('onlyAvailable') === 'true';
        const search = searchParams.get('search') || undefined;

        const products = await getProducts({ onlyAvailable, search });

        return NextResponse.json({ success: true, data: products });
    } catch (error) {
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: (error as Error).message } }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // 1. Xác thực phân quyền: chỉ cho phép OWNER hoặc MANAGER
        const authResult = await verifyUserRole(['OWNER', 'MANAGER']);
        if (!authResult.success) {
            return authResult.errorResponse;
        }

        // 2. Lấy và phân tích dữ liệu body
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json(
                { success: false, error: { code: 'BAD_REQUEST', message: 'Dữ liệu yêu cầu không hợp lệ hoặc thiếu body.' } },
                { status: 400 }
            );
        }

        // 3. Validate dữ liệu đầu vào
        const validationResult = productSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { success: false, error: { code: 'BAD_REQUEST', message: validationResult.error.issues[0]?.message || 'Dữ liệu yêu cầu không hợp lệ.' } },
                { status: 400 }
            );
        }
        const validData = validationResult.data;

        // 4. Tạo sản phẩm trong database thông qua repository
        const res = await createProduct({
            product_name: validData.product_name,
            unit_price: validData.unit_price,
            stock_quantity: validData.stock_quantity,
            base_unit: validData.base_unit ?? null,
            is_packable: validData.is_packable ?? false,
            pack_unit: validData.pack_unit ?? null,
            units_per_pack: validData.units_per_pack ?? null,
            pack_price: validData.pack_price ?? null,
        });

        if (!res.success || !res.data) {
            return NextResponse.json(
                { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: res.error || 'Không thể tạo sản phẩm.' } },
                { status: 500 }
            );
        }

        // 5. Trả về kết quả thành công với status 201
        return NextResponse.json({ success: true, data: res.data }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: (error as Error).message } },
            { status: 500 }
        );
    }
}