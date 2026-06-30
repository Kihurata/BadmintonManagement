'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface UserRoleContextType {
    role: 'OWNER' | 'MANAGER' | 'STAFF' | null;
    email: string | null;
    loading: boolean;
    tenantId: string | null;
    refreshRole: () => Promise<void>;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [role, setRole] = useState<'OWNER' | 'MANAGER' | 'STAFF' | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchRole = useCallback(async (userId: string, userEmail: string) => {
        try {
            const { data, error } = await supabase
                .from('user_roles')
                .select('role, tenant_id')
                .eq('user_id', userId)
                .single();

            if (error) {
                console.error('Error fetching role:', error);
                setRole(null);
                setTenantId(null);
            } else if (data) {
                setRole(data.role as 'OWNER' | 'MANAGER' | 'STAFF');
                setTenantId(data.tenant_id);
            }
            setEmail(userEmail);
        } catch (err) {
            console.error('Unexpected error fetching role:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshRole = useCallback(async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await fetchRole(user.id, user.email || '');
        } else {
            setRole(null);
            setEmail(null);
            setTenantId(null);
            setLoading(false);
        }
    }, [fetchRole]);

    useEffect(() => {
        // Fetch on mount
        refreshRole();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                await fetchRole(session.user.id, session.user.email || '');
            } else {
                setRole(null);
                setEmail(null);
                setTenantId(null);
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [refreshRole, fetchRole]);

    return (
        <UserRoleContext.Provider value={{ role, email, loading, tenantId, refreshRole }}>
            {children}
        </UserRoleContext.Provider>
    );
}

export function useUserRole() {
    const context = useContext(UserRoleContext);
    if (context === undefined) {
        throw new Error('useUserRole must be used within an AuthProvider');
    }
    return context;
}
