import { createClient } from '@/utils/supabase/server';

export interface AuthResult {
  success: boolean;
  userId?: string;
  role?: 'OWNER' | 'MANAGER' | 'STAFF';
  tenantId?: string;
  errorResponse?: Response;
}

/**
 * Verifies that the user is authenticated and has one of the allowed roles.
 * Returns the session details or an error Response if verification fails.
 */
export async function verifyUserRole(
  allowedRoles?: Array<'OWNER' | 'MANAGER' | 'STAFF'>
): Promise<AuthResult> {
  const supabase = createClient();
  
  // Get active session user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Unauthorized: Please log in.',
          },
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  // Get user role from user_roles table
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role, tenant_id')
    .eq('user_id', user.id)
    .single();

  if (roleError || !roleData) {
    return {
      success: false,
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Forbidden: Access role not assigned.',
          },
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  const role = roleData.role as 'OWNER' | 'MANAGER' | 'STAFF';
  const tenantId = roleData.tenant_id;

  if (allowedRoles && !allowedRoles.includes(role)) {
    return {
      success: false,
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Forbidden: Action restricted to roles: ${allowedRoles.join(', ')}.`,
          },
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  return {
    success: true,
    userId: user.id,
    role,
    tenantId,
  };
}
