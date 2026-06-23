import { createClient } from '@/utils/supabase/server';

export interface Product {
  id: string;
  product_name: string;
  unit_price: number;
  base_unit: string | null;
  is_packable: boolean;
  pack_unit: string | null;
  units_per_pack: number | null;
  pack_price: number | null;
  stock_quantity: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  type: 'LOYAL' | 'GUEST';
}

export async function createProduct(product: Omit<Product, 'id'>): Promise<{ success: boolean; data?: Product; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function updateProduct(productId: string, product: Partial<Omit<Product, 'id'>>
): Promise<{ success: boolean, data?: Product, error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .update(product)
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function getAvailableProducts(): Promise<Product[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .gt('stock_quantity', 0)
    .order('product_name');

  if (error) {
    console.error('Error fetching available products:', error);
    return [];
  }
  return data || [];
}

export async function getCustomers(): Promise<Customer[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
  return data || [];
}

export async function getOrCreateGuestCustomer(): Promise<Customer> {
  const supabase = createClient();

  // Find guest
  const { data: guest } = await supabase
    .from('customers')
    .select('id, name, phone, type')
    .eq('name', 'Khách vãng lai')
    .single();

  if (guest) {
    return guest as Customer;
  }

  // Create new guest
  const { data: newGuest, error: createError } = await supabase
    .from('customers')
    .insert([{ name: 'Khách vãng lai', type: 'GUEST' }])
    .select()
    .single();

  if (createError || !newGuest) {
    throw new Error('Không thể tạo khách vãng lai mặc định: ' + (createError?.message || 'Unknown error'));
  }

  return newGuest as Customer;
}

export async function getProducts(filters?: { onlyAvailable?: boolean; search?: string; }): Promise<Product[]> {
  const supabase = createClient();
  let query = supabase.from('products').select('*');

  if (filters?.onlyAvailable) {
    query = query.gt('stock_quantity', 0);
  }

  if (filters?.search) {
    query = query.ilike('product_name', `%${filters?.search}%`);
  }

  const { data, error } = await query.order('product_name');

  if (error) {
    console.log('Error fetching products', error);
    return [];
  }

  return data || [];
}

export async function getProductById(productId: string): Promise<Product | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error) {
    console.error(`Error fetching product by ID ${productId}:`, error);
    return null;
  }

  return data;
}

export async function deleteProduct(productId: string): Promise<{ success: boolean; error?: string; code?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)

  if (error) {
    return {
      success: false, error: error.message, code: error.code
    };
  }
  return { success: true };
}