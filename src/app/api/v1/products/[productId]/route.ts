import { NextRequest, NextResponse } from "next/server";
import { getProductById, updateProduct, deleteProduct } from "@/server/repositories/product-repo";
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

const productPartialSchema = productSchema.partial();

export async function GET(
    req: NextRequest,
    { params }: { params: { productId: string } }
) {
    try {
        const productId = params.productId;
        if (!productId) {
            return NextResponse.json(
                { success: false, error: { code: 'BAD_REQUEST', message: 'Thiếu ID sản phẩm.' } },
                { status: 400 }
            );
        }

        const product = await getProductById(productId);

        if (!product) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Sản phẩm không tồn tại.' } },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: product }, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: (error as Error).message } },
            { status: 500 }
        );
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: { productId: string } }
) {
    try {
        // 1. Xác thực phân quyền
        const authResult = await verifyUserRole(['OWNER', 'MANAGER']);
        if (!authResult.success) {
            return authResult.errorResponse;
        }

        const productId = params.productId;
        if (!productId) {
            return NextResponse.json(
                { success: false, error: { code: 'BAD_REQUEST', message: 'Thiếu ID sản phẩm.' } },
                { status: 400 }
            );
        }

        // 2. Kiểm tra sản phẩm tồn tại
        const product = await getProductById(productId);
        if (!product) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Sản phẩm không tồn tại.' } },
                { status: 404 }
            );
        }

        // 3. Lấy và phân tích dữ liệu body
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json(
                { success: false, error: { code: 'BAD_REQUEST', message: 'Dữ liệu yêu cầu không hợp lệ hoặc thiếu body.' } },
                { status: 400 }
            );
        }

        // 4. Validate toàn bộ dữ liệu (PUT)
        const validationResult = productSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { success: false, error: { code: 'BAD_REQUEST', message: validationResult.error.issues[0]?.message || 'Dữ liệu yêu cầu không hợp lệ.' } },
                { status: 400 }
            );
        }

        // 5. Cập nhật sản phẩm
        const {
            product_name,
            unit_price,
            stock_quantity,
            base_unit,
            is_packable,
            pack_unit,
            units_per_pack,
            pack_price
        } = validationResult.data;

        const res = await updateProduct(productId, {
            product_name,
            unit_price,
            stock_quantity,
            base_unit: base_unit || null,
            is_packable: is_packable || false,
            pack_unit: pack_unit || null,
            units_per_pack: units_per_pack || null,
            pack_price: pack_price || null,
        });

        if (!res.success || !res.data) {
            return NextResponse.json(
                { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: res.error || 'Không thể cập nhật sản phẩm.' } },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data: res.data }, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: (error as Error).message } },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { productId: string } }
) {
    try {
        // 1. Xác thực phân quyền
        const authResult = await verifyUserRole(['OWNER', 'MANAGER']);
        if (!authResult.success) {
            return authResult.errorResponse;
        }

        const productId = params.productId;
        if (!productId) {
            return NextResponse.json(
                { success: false, error: { code: 'BAD_REQUEST', message: 'Thiếu ID sản phẩm.' } },
                { status: 400 }
            );
        }

        // 2. Kiểm tra sản phẩm tồn tại
        const product = await getProductById(productId);
        if (!product) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Sản phẩm không tồn tại.' } },
                { status: 404 }
            );
        }

        // 3. Lấy và phân tích dữ liệu body
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json(
                { success: false, error: { code: 'BAD_REQUEST', message: 'Dữ liệu yêu cầu không hợp lệ hoặc thiếu body.' } },
                { status: 400 }
            );
        }

        // 4. Validate một phần dữ liệu (PATCH)
        const validationResult = productPartialSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { success: false, error: { code: 'BAD_REQUEST', message: validationResult.error.issues[0]?.message || 'Dữ liệu yêu cầu không hợp lệ.' } },
                { status: 400 }
            );
        }

        // 5. Cập nhật sản phẩm
        const res = await updateProduct(productId, validationResult.data);

        if (!res.success || !res.data) {
            return NextResponse.json(
                { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: res.error || 'Không thể cập nhật sản phẩm.' } },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data: res.data }, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: (error as Error).message } },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { productId: string } }
) {
    try {
        // 1. Xác thực phân quyền
        const authResult = await verifyUserRole(['OWNER', 'MANAGER']);
        if (!authResult.success) {
            return authResult.errorResponse;
        }

        const productId = params.productId;
        if (!productId) {
            return NextResponse.json(
                { success: false, error: { code: 'BAD_REQUEST', message: 'Thiếu ID sản phẩm.' } },
                { status: 400 }
            );
        }

        // 2. Kiểm tra sản phẩm tồn tại
        const product = await getProductById(productId);
        if (!product) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Sản phẩm không tồn tại.' } },
                { status: 404 }
            );
        }

        // 3. Xóa sản phẩm
        const res = await deleteProduct(productId);

        if (!res.success) {
            // Lỗi foreign key violation từ Postgres: mã lỗi 23503
            if (res.code === '23503') {
                return NextResponse.json(
                    {
                        success: false,
                        error: {
                            code: 'CONFLICT',
                            message: 'Không thể xóa sản phẩm vì đã được liên kết với hóa đơn hoặc nhật ký kho hàng.'
                        }
                    },
                    { status: 409 }
                );
            }

            return NextResponse.json(
                { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: res.error || 'Không thể xóa sản phẩm.' } },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { success: true, message: 'Xóa sản phẩm thành công.' },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: (error as Error).message } },
            { status: 500 }
        );
    }
}