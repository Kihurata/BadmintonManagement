import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Badminton Management',
        short_name: 'BMS',
        description: 'Manage your badminton court bookings and sales.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#047857', // Emerald 600
        icons: [
            {
                src: '/icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}
