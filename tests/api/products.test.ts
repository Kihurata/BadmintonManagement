import { NextRequest, NextResponse } from 'next/server';
import { GET as getProductsApi, POST as createProductApi } from '@/app/api/v1/products/route';
import { PUT as putProduct, PATCH as patchProduct, DELETE as deleteProductApi } from '@/app/api/v1/products/[productId]/route';
import * as productRepo from '@/server/repositories/product-repo';
import { verifyUserRole } from '@/lib/api-auth';

jest.mock('@/server/repositories/product-repo');
jest.mock('@/lib/api-auth');

describe('RESTful Products API Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyUserRole as jest.Mock).mockImplementation(async () => ({ success: true, role: 'OWNER' }));
  });

  describe('GET /api/v1/products', () => {
    it('should return all available products by default', async () => {
      const mockProducts = [{ id: 'p1', product_name: 'Yonex' }];
      (productRepo.getProducts as jest.Mock).mockResolvedValueOnce(mockProducts);

      const req = { url: 'http://localhost:3000/api/v1/products' } as unknown as NextRequest;
      const res = await getProductsApi(req);

      expect(res!.status).toBe(200);
      const body = await res!.json();
      expect(body).toEqual({ success: true, data: mockProducts });
      expect(productRepo.getProducts).toHaveBeenCalledWith({ onlyAvailable: false, search: undefined, status: undefined });
    });

    it('should parse query parameters correctly', async () => {
      (productRepo.getProducts as jest.Mock).mockResolvedValueOnce([]);

      const req = { url: 'http://localhost:3000/api/v1/products?onlyAvailable=true&status=INACTIVE' } as unknown as NextRequest;
      const res = await getProductsApi(req);

      expect(res!.status).toBe(200);
      expect(productRepo.getProducts).toHaveBeenCalledWith({ onlyAvailable: true, search: undefined, status: 'INACTIVE' });
    });
  });

  describe('POST /api/v1/products', () => {
    it('should return 403 if user is STAFF', async () => {
      (verifyUserRole as jest.Mock).mockImplementationOnce(async () => ({
        success: false,
        errorResponse: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }),
      }));

      const req = {} as unknown as NextRequest;
      const res = await createProductApi(req);
      expect(res!.status).toBe(403);
    });

    it('should return 400 if JSON is malformed', async () => {
      (verifyUserRole as jest.Mock).mockResolvedValueOnce({ success: true, role: 'OWNER' });
      const req = {
        json: jest.fn().mockRejectedValueOnce(new SyntaxError('Unexpected token')),
      } as unknown as NextRequest;

      const res = await createProductApi(req);
      expect(res!.status).toBe(400);

      const body = await res!.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('BAD_REQUEST');
    });

    it('should return 400 if validation fails', async () => {
      (verifyUserRole as jest.Mock).mockResolvedValueOnce({ success: true, role: 'OWNER' });
      const req = {
        json: jest.fn().mockResolvedValueOnce({ product_name: '' }), // Invalid name
      } as unknown as NextRequest;

      const res = await createProductApi(req);
      expect(res!.status).toBe(400);

      const body = await res!.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Tên sản phẩm không được để trống');
    });

    it('should create product successfully', async () => {
      (verifyUserRole as jest.Mock).mockResolvedValueOnce({ success: true, role: 'OWNER' });
      const mockProduct = { id: 'p1', product_name: 'Stinger', unit_price: 150000, stock_quantity: 10 };
      (productRepo.createProduct as jest.Mock).mockResolvedValueOnce({ success: true, data: mockProduct });

      const req = {
        json: jest.fn().mockResolvedValueOnce({
          product_name: 'Stinger',
          unit_price: 150000,
          stock_quantity: 10,
        }),
      } as unknown as NextRequest;

      const res = await createProductApi(req);
      expect(res!.status).toBe(201);

      const body = await res!.json();
      expect(body).toEqual({ success: true, data: mockProduct });
    });

    it('should return 400 if is_packable is true but pack details are missing', async () => {
      (verifyUserRole as jest.Mock).mockResolvedValueOnce({ success: true, role: 'OWNER' });

      const req = {
        json: jest.fn().mockResolvedValueOnce({
          product_name: 'Stinger Pack',
          unit_price: 10000,
          stock_quantity: 10,
          is_packable: true,
        }),
      } as unknown as NextRequest;

      const res = await createProductApi(req);
      expect(res!.status).toBe(400);

      const body = await res!.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Nếu sản phẩm có đóng gói');
    });

    it('should create product successfully with packaging details when is_packable is true', async () => {
      (verifyUserRole as jest.Mock).mockResolvedValueOnce({ success: true, role: 'OWNER' });
      const mockProduct = {
        id: 'p1',
        product_name: 'Stinger Pack',
        unit_price: 10000,
        stock_quantity: 10,
        is_packable: true,
        pack_unit: 'Thùng',
        units_per_pack: 24,
        pack_price: 220000,
      };
      (productRepo.createProduct as jest.Mock).mockResolvedValueOnce({ success: true, data: mockProduct });

      const req = {
        json: jest.fn().mockResolvedValueOnce({
          product_name: 'Stinger Pack',
          unit_price: 10000,
          stock_quantity: 10,
          is_packable: true,
          pack_unit: 'Thùng',
          units_per_pack: 24,
          pack_price: 220000,
        }),
      } as unknown as NextRequest;

      const res = await createProductApi(req);
      expect(res!.status).toBe(201);
    });
  });

  describe('PUT /api/v1/products/[productId]', () => {
    it('should return 404 if product does not exist', async () => {
      (verifyUserRole as jest.Mock).mockResolvedValueOnce({ success: true, role: 'OWNER' });
      (productRepo.getProductById as jest.Mock).mockResolvedValueOnce(null);

      const req = {} as unknown as NextRequest;
      const res = await putProduct(req, { params: { productId: 'p999' } });
      expect(res!.status).toBe(404);
    });

    it('should update product successfully', async () => {
      (verifyUserRole as jest.Mock).mockResolvedValueOnce({ success: true, role: 'OWNER' });
      const existingProduct = { id: 'p1', product_name: 'Stinger', unit_price: 150000, stock_quantity: 10 };
      (productRepo.getProductById as jest.Mock).mockResolvedValueOnce(existingProduct);

      const updatedProduct = { ...existingProduct, unit_price: 160000 };
      (productRepo.updateProduct as jest.Mock).mockResolvedValueOnce({ success: true, data: updatedProduct });

      const req = {
        json: jest.fn().mockResolvedValueOnce({
          product_name: 'Stinger',
          unit_price: 160000,
          stock_quantity: 10,
        }),
      } as unknown as NextRequest;

      const res = await putProduct(req, { params: { productId: 'p1' } });
      expect(res!.status).toBe(200);

      const body = await res!.json();
      expect(body).toEqual({ success: true, data: updatedProduct });
    });
  });

  describe('PATCH /api/v1/products/[productId]', () => {
    it('should perform partial validation and update', async () => {
      (verifyUserRole as jest.Mock).mockResolvedValueOnce({ success: true, role: 'OWNER' });
      const existingProduct = { id: 'p1', product_name: 'Stinger', unit_price: 150000, stock_quantity: 10 };
      (productRepo.getProductById as jest.Mock).mockResolvedValueOnce(existingProduct);

      const updatedProduct = { ...existingProduct, unit_price: 170000 };
      (productRepo.updateProduct as jest.Mock).mockResolvedValueOnce({ success: true, data: updatedProduct });

      const req = {
        json: jest.fn().mockResolvedValueOnce({
          unit_price: 170000,
        }),
      } as unknown as NextRequest;

      const res = await patchProduct(req, { params: { productId: 'p1' } });
      expect(res!.status).toBe(200);

      const body = await res!.json();
      expect(body).toEqual({ success: true, data: updatedProduct });
      expect(productRepo.updateProduct).toHaveBeenCalledWith('p1', { unit_price: 170000 });
    });

    it('should return 400 if patching is_packable to true without packaging details', async () => {
      (verifyUserRole as jest.Mock).mockResolvedValueOnce({ success: true, role: 'OWNER' });
      const existingProduct = { id: 'p1', product_name: 'Stinger', unit_price: 150000, stock_quantity: 10 };
      (productRepo.getProductById as jest.Mock).mockResolvedValueOnce(existingProduct);

      const req = {
        json: jest.fn().mockResolvedValueOnce({
          is_packable: true,
        }),
      } as unknown as NextRequest;

      const res = await patchProduct(req, { params: { productId: 'p1' } });
      expect(res!.status).toBe(400);

      const body = await res!.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Nếu sản phẩm có đóng gói');
    });

    it('should allow updating product status', async () => {
      (verifyUserRole as jest.Mock).mockResolvedValueOnce({ success: true, role: 'OWNER' });
      const existingProduct = { id: 'p1', product_name: 'Stinger', unit_price: 150000, stock_quantity: 10, status: 'ACTIVE' };
      (productRepo.getProductById as jest.Mock).mockResolvedValueOnce(existingProduct);

      const updatedProduct = { ...existingProduct, status: 'INACTIVE' };
      (productRepo.updateProduct as jest.Mock).mockResolvedValueOnce({ success: true, data: updatedProduct });

      const req = {
        json: jest.fn().mockResolvedValueOnce({
          status: 'INACTIVE',
        }),
      } as unknown as NextRequest;

      const res = await patchProduct(req, { params: { productId: 'p1' } });
      expect(res!.status).toBe(200);

      const body = await res!.json();
      expect(body).toEqual({ success: true, data: updatedProduct });
      expect(productRepo.updateProduct).toHaveBeenCalledWith('p1', { status: 'INACTIVE' });
    });
  });

  describe('DELETE /api/v1/products/[productId]', () => {
    it('should delete product successfully', async () => {
      (verifyUserRole as jest.Mock).mockResolvedValueOnce({ success: true, role: 'OWNER' });
      (productRepo.getProductById as jest.Mock).mockResolvedValueOnce({ id: 'p1' });
      (productRepo.deleteProduct as jest.Mock).mockResolvedValueOnce({ success: true });

      const req = {} as unknown as NextRequest;
      const res = await deleteProductApi(req, { params: { productId: 'p1' } });
      expect(res!.status).toBe(200);
    });

    it('should return 409 Conflict if delete fails with code 23503', async () => {
      (verifyUserRole as jest.Mock).mockResolvedValueOnce({ success: true, role: 'OWNER' });
      (productRepo.getProductById as jest.Mock).mockResolvedValueOnce({ id: 'p1' });
      (productRepo.deleteProduct as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'ForeignKeyViolation',
        code: '23503',
      });

      const req = {} as unknown as NextRequest;
      const res = await deleteProductApi(req, { params: { productId: 'p1' } });
      expect(res!.status).toBe(409);

      const body = await res!.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('CONFLICT');
    });
  });
});
