'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // TODO: Add simple validation

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        redirect('/login?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(formData: FormData) {
    const supabase = createClient()

    // Create an admin/owner account logic
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const tenantName = formData.get('tenantName') as string

    // NOTE: This usually needs a more robust approach in production, 
    // maybe through Supabase Edge Functions to ensure atomicity.

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    })

    if (error) {
        redirect('/register?error=' + encodeURIComponent(error.message))
    }

    if (data.user) {
        // Wait for auth to finish, then we create the tenant and link it
        // In a real scenario, RLS for new signups could be tricky. 
        // Usually, you bypass RLS for tenant creation or use a trigger on auth.users insert.
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .insert({ name: tenantName })
            .select()
            .single()

        if (tenantError || !tenant) {
            console.error(tenantError)
            redirect('/register?error=' + encodeURIComponent('Failed to create facility data'))
        }

        const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
                user_id: data.user.id,
                tenant_id: tenant.id,
                role: 'OWNER'
            })

        if (roleError) {
            console.error(roleError)
            redirect('/register?error=' + encodeURIComponent('Failed to assign role'))
        }
    }

    revalidatePath('/', 'layout')
    redirect('/login?message=Check your email to continue sign in process')
}

export async function logout() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
        console.error("Error logging out:", error)
    }

    revalidatePath('/', 'layout')
    redirect('/login')
}
