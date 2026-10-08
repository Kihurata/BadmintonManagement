import { getCustomers } from '@/server/repositories/product-repo';
import CustomersClient from '@/components/customers/customers-client';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
    const customers = await getCustomers();

    return (
        <CustomersClient initialCustomers={customers} />
    );
}
