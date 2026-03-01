import { setupCourts } from '@/app/onboarding/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function OnboardingPage({
    searchParams,
}: {
    searchParams: { message?: string; error?: string }
}) {
    return (
        <div className="flex min-h-screen w-screen items-center justify-center bg-gray-50 p-4">
            <div className="z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
                <div className="flex flex-col items-center justify-center space-y-3 border-b border-emerald-500 bg-emerald-50 px-4 py-8 text-center sm:px-16">
                    <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg mb-2">
                        <span className="material-symbols-outlined text-3xl">celebration</span>
                    </div>
                    <h2 className="text-2xl font-bold text-emerald-900">Chào mừng bạn!</h2>
                    <p className="text-sm text-emerald-700">
                        Cảm ơn bạn đã lựa chọn sử dụng phần mềm. Hãy thiết lập sơ bộ danh sách sân của bạn để bắt đầu nhé.
                    </p>
                </div>

                <form action={setupCourts} className="flex flex-col space-y-6 px-4 py-8 sm:px-12">
                    {searchParams?.error && (
                        <div className="rounded-md bg-red-50 p-3">
                            <p className="text-sm text-red-700 text-center">{searchParams.error}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="courtCount" className="font-semibold text-gray-700">Tổng số Sân lông đang có</Label>
                            <Input
                                id="courtCount"
                                name="courtCount"
                                type="number"
                                required
                                min={1}
                                max={50}
                                placeholder="Ví dụ: 6"
                                className="h-12 text-lg"
                            />
                            <p className="text-xs text-gray-500">Hệ thống sẽ tự động tạo danh sách sân từ Sân số 1 đến n.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="grid items-center gap-1.5">
                                <Label htmlFor="morningPrice" className="text-gray-700">Giá Sáng (Vãng lai)</Label>
                                <Input
                                    id="morningPrice"
                                    name="morningPrice"
                                    type="number"
                                    required
                                    min={0}
                                    placeholder="VNĐ/giờ"
                                    className="h-10"
                                />
                            </div>
                            <div className="grid items-center gap-1.5">
                                <Label htmlFor="eveningPrice" className="text-gray-700">Giá Tối (Vãng lai)</Label>
                                <Input
                                    id="eveningPrice"
                                    name="eveningPrice"
                                    type="number"
                                    required
                                    min={0}
                                    placeholder="VNĐ/giờ"
                                    className="h-10"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button type="submit" className="w-full h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700">
                            Hoàn tất & Bắt đầu sử dụng
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
