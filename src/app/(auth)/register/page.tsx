import { signup } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RegisterPage({
    searchParams,
}: {
    searchParams: { message?: string; error?: string }
}) {
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
            <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
                <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
                    <h3 className="text-xl font-semibold">Tạo Hệ thống Sân Mới</h3>
                    <p className="text-sm text-gray-500">
                        Đăng ký để bắt đầu sử dụng phần mềm quản lý sân cầu lông của chúng tôi.
                    </p>
                </div>
                <form action={signup} className="flex flex-col space-y-4 px-4 py-8 sm:px-16">
                    {searchParams?.error && (
                        <div className="rounded-md bg-red-50 p-3">
                            <p className="text-sm text-red-700 text-center">{searchParams.error}</p>
                        </div>
                    )}
                    {searchParams?.message && (
                        <div className="rounded-md bg-green-50 p-3">
                            <p className="text-sm text-green-700 text-center">{searchParams.message}</p>
                        </div>
                    )}
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="tenantName">Tên Cơ sở / Sân</Label>
                        <Input
                            id="tenantName"
                            name="tenantName"
                            type="text"
                            required
                            placeholder="VD: Sân Cầu Lông Lan Anh 2"
                        />
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="email">Email Quản trị</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            required
                            placeholder="owner@example.com"
                        />
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="password">Mật khẩu</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                        />
                    </div>
                    <Button type="submit">Đăng ký Sân</Button>
                    <div className="text-center text-sm text-gray-500 mt-4">
                        Đã có tài khoản? <a href="/login" className="text-blue-600 hover:underline">Hãy đăng nhập</a>
                    </div>
                </form>
            </div>
        </div>
    )
}
