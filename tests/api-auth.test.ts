import { verifyUserRole } from '@/lib/api-auth';

// Polyfill Response for JSDOM environment in Jest
if (typeof global.Response === 'undefined') {
  global.Response = class {
    status: number;
    headers: any;
    body: string;
    constructor(body: string, init?: any) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.headers = init?.headers;
    }
    async json() {
      return JSON.parse(this.body);
    }
  } as any;
}

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

jest.mock('@/utils/supabase/server', () => ({
  createClient: () => mockSupabase,
}));

describe('verifyUserRole tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 Unauthorized if user is not logged in', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No user') });

    const result = await verifyUserRole();
    expect(result.success).toBe(false);
    expect(result.errorResponse).toBeDefined();
    expect(result.errorResponse?.status).toBe(401);
    
    const body = await result.errorResponse?.json();
    expect(body).toEqual({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized: Please log in.',
      },
    });
  });

  it('should return 403 Forbidden if user role is not assigned', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user_123' } }, error: null });
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: new Error('Role not found') });

    const result = await verifyUserRole();
    expect(result.success).toBe(false);
    expect(result.errorResponse?.status).toBe(403);

    const body = await result.errorResponse?.json();
    expect(body).toEqual({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Forbidden: Access role not assigned.',
      },
    });
  });

  it('should succeed and return user details if role is allowed (no specific allowedRoles requested)', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user_123' } }, error: null });
    mockSupabase.single.mockResolvedValueOnce({ data: { role: 'STAFF', tenant_id: 'tenant_abc' }, error: null });

    const result = await verifyUserRole();
    expect(result.success).toBe(true);
    expect(result.userId).toBe('user_123');
    expect(result.role).toBe('STAFF');
    expect(result.tenantId).toBe('tenant_abc');
    expect(result.errorResponse).toBeUndefined();
  });

  it('should succeed if user role is in the allowedRoles list', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user_123' } }, error: null });
    mockSupabase.single.mockResolvedValueOnce({ data: { role: 'OWNER', tenant_id: 'tenant_abc' }, error: null });

    const result = await verifyUserRole(['OWNER', 'MANAGER']);
    expect(result.success).toBe(true);
    expect(result.role).toBe('OWNER');
  });

  it('should return 403 Forbidden if user role is not in the allowedRoles list', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user_123' } }, error: null });
    mockSupabase.single.mockResolvedValueOnce({ data: { role: 'STAFF', tenant_id: 'tenant_abc' }, error: null });

    const result = await verifyUserRole(['OWNER', 'MANAGER']);
    expect(result.success).toBe(false);
    expect(result.errorResponse?.status).toBe(403);

    const body = await result.errorResponse?.json();
    expect(body).toEqual({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Forbidden: Action restricted to roles: OWNER, MANAGER.',
      },
    });
  });
});
