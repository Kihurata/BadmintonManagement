'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function setupCourts(formData: FormData) {
    const supabase = createClient();

    // 1. Xác thực User
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login?error=' + encodeURIComponent('Phiên đăng nhập đã hết hạn.'));
    }

    // 2. Lấy Tenant ID của user hiện tại
    const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

    if (roleError || !roleData) {
        redirect('/onboarding?error=' + encodeURIComponent('Không tìm thấy thông tin cơ sở của bạn.'));
    }

    const tenantId = roleData.tenant_id;

    // 3. Chuẩn bị dữ liệu
    const courtCount = parseInt(formData.get('courtCount') as string) || 0;
    const morningPrice = parseInt(formData.get('morningPrice') as string) || 0;
    const eveningPrice = parseInt(formData.get('eveningPrice') as string) || 0;

    if (courtCount <= 0) {
        redirect('/onboarding?error=' + encodeURIComponent('Số lượng sân phải lớn hơn 0.'));
    }

    const courtsToInsert = Array.from({ length: courtCount }).map((_, index) => ({
        tenant_id: tenantId,
        court_name: `Sân số ${index + 1}`,
        morning_price_guest: morningPrice,
        evening_price_guest: eveningPrice,
        morning_price_loyal: morningPrice, // Default same as guest
        evening_price_loyal: eveningPrice, // Default same as guest
    }));

    // 4. Chèn dữ liệu Sân
    const { error: insertError } = await supabase
        .from('courts')
        .insert(courtsToInsert);

    if (insertError) {
        console.error("Lỗi khi chèn sân:", insertError);
        redirect('/onboarding?error=' + encodeURIComponent('Có lỗi xảy ra khi tạo danh sách sân.'));
    }

    // 5. Hoàn tất
    revalidatePath('/', 'layout');
    redirect('/');
}
