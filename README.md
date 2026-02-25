# 🏸 Badminton Management System

A comprehensive web application designed to streamline the operations of badminton court facilities. This project provides a robust solution for managing bookings, tracking inventory, handling customer data, and generating financial reports.

## ✨ Key Features

- **📅 Court Booking Management:** Intuitive interface for reserving courts, managing time slots, and tracking availability.
- **🧾 Invoicing & Payments:** Seamless payment flow including bank transfers with dynamic QR code generation.
- **📦 Inventory & POS:** Manage products (drinks, rental equipment, packages) and handle point-of-sale transactions.
- **👥 Customer Management:** Maintain detailed profiles and history for facility users.
- **📊 Interactive Dashboard:** Real-time analytics, reporting, and revenue tracking using interactive charts.
- **📱 Progressive Web App (PWA):** Installable on mobile and desktop for a native-like experience.

## 🛠️ Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
- **Database & Auth:** [Supabase](https://supabase.com/)
- **Charts:** [Recharts](https://recharts.org/)
- **Date Utility:** `date-fns`

## 📂 Project Structure

```text
src/
├── app/               # Next.js App Router (Pages & Layouts)
│   ├── customers/     # Customer management pages
│   ├── dashboard/     # Analytics and reporting pages
│   ├── invoices/      # Invoice tracking and details
│   ├── products/      # Inventory and product management
│   └── api/           # API routes
├── components/        # Reusable UI components & shadcn/ui elements
├── lib/               # Utility functions and Supabase client setup
└── types/             # TypeScript type definitions
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- React 18+
- Any package manager (`npm`, `yarn`, `pnpm`, or `bun`)
- A [Supabase](https://supabase.com/) account and project.

### Environment Setup

This application can be configured for three different environments: **Local (Development)**, **Staging**, and **Production**.

#### 1. Local Development (Supabase CLI & Docker)

For the best local development experience, run a local instance of Supabase using the [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker.
1. Make sure Docker is installed and running.
2. Initialize and start the local Supabase stack in your project directory:
   ```bash
   supabase init
   supabase start
   ```
3. Once started, the CLI will output your local API URL and anon key.
4. Create a `.env.local` file in the root directory and add those credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key_from_cli
   ```

#### 2. Staging Environment

The staging environment connects to a separate Supabase project to test features safely before rolling them out to production.
1. Create an `.env.staging` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_staging_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_staging_anon_key
   ```
2. When deploying to your staging platform (like Vercel), add these staging credentials directly into the platform's Environment Variables settings.

#### 3. Production Environment

Production points to your live Supabase project and database.
1. When deploying to your live hosting platform (e.g., Vercel), add the production environment variables to your project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your live production URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your live production anon key
2. **Note:** Never commit production `.env` files with sensitive information. Next.js automatically picks up the environment variables from your hosting provider during the build process.

### Installation & Running Locally

1. **Clone the repository** and navigate to the project folder.
2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```
3. **Run the development server** (it will automatically use variables from `.env.local`):
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page if you want to contribute.

## 📄 License

This project is licensed under the MIT License.
