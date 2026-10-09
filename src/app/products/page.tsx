import { getProducts } from '@/server/repositories/product-repo';
import ProductsClient from '@/components/products/products-client';
import { Product } from '@/types';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
    const products = await getProducts({ status: 'ALL' });

    return (
        <ProductsClient initialProducts={products as unknown as Product[]} />
    );
}
