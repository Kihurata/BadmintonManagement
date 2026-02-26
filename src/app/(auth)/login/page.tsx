import { login } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage({
    searchParams,
}: {
    searchParams: { message?: string; error?: string }
}) {
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
            <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
                <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
                    <h3 className="text-xl font-semibold">Đăng nhập Quản trị viên</h3>
                    <p className="text-sm text-gray-500">
                        Sử dụng email và mật khẩu để quản lý hệ thống.
                    </p>
                </div>
                <form action={login} className="flex flex-col space-y-4 px-4 py-8 sm:px-16">
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
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            placeholder="admin@example.com"
                        />
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="password">Mật khẩu</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                        />
                    </div>
                    {/* <FormSubmitButton /> có thể làm thêm sau */}
                    <Button type="submit">Đăng nhập</Button>
                    <div className="text-center text-sm text-gray-500 mt-4">
                        Chưa có tài khoản? <a href="/register" className="text-blue-600 hover:underline">Hãy tạo Sân mới</a>
                    </div>
                </form>
            </div>
        </div>
    )
}
