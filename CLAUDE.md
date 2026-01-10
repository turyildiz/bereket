# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bereket Market is a German-language marketplace platform for local oriental/Turkish grocery stores. The platform allows customers to discover deals from local markets and enables store owners to manage their shops via an admin dashboard.

## Tech Stack

- **Framework**: Next.js 16.1.1 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 with custom CSS variables (spice-themed color palette)
- **Database/Auth**: Supabase (PostgreSQL with Row Level Security)
- **Fonts**: Playfair Display (headings) + Outfit (body) via next/font

## Common Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

### Directory Structure

```
app/
├── page.tsx              # Homepage with featured shops and offers
├── layout.tsx            # Root layout with fonts and LayoutWrapper
├── globals.css           # Tailwind + custom CSS variables and animations
├── mock-data.ts          # Sample shop/offer data for frontend
├── components/
│   └── LayoutWrapper.tsx # Client component: nav + footer (hidden on /admin routes)
├── shop/[id]/page.tsx    # Dynamic shop profile page
└── admin/
    ├── login/page.tsx    # Admin authentication (client component)
    └── dashboard/
        ├── page.tsx          # Server component: auth check + data fetch
        └── DashboardClient.tsx  # Client component: market CRUD operations

utils/supabase/
├── client.ts     # Browser client (createBrowserClient)
├── server.ts     # Server client with cookies (createServerClient)
└── middleware.ts # Session refresh middleware
```

### Key Patterns

**Server vs Client Components**: Dashboard uses a split pattern - `page.tsx` (server) handles auth/data fetching, passes props to `DashboardClient.tsx` (client) for interactive UI.

**Supabase Clients**: Use `utils/supabase/client.ts` in client components ('use client'), use `utils/supabase/server.ts` in server components and API routes.

**Admin Route Detection**: `LayoutWrapper.tsx` checks `pathname?.startsWith('/admin')` to hide main nav/footer on admin pages.

### Database Schema (Supabase)

**Tables**:
- `profiles`: User admin status (id, email, is_admin, created_at)
- `markets`: Store data (id, name, city, full_address, latitude, longitude, customer_phone, whatsapp_numbers[], logo_url, header_url, about_text, features[], opening_hours[], is_premium, created_at)
- `offers`: Product deals (market_id, product_name, price, original_price, expires_at, image_url)

**Storage**: `market-assets` bucket for logo/header image uploads

### Theming

CSS variables defined in `globals.css`:
- Primary colors: `--saffron`, `--terracotta`, `--cardamom`, `--burgundy`
- Neutrals: `--cream`, `--sand`, `--charcoal`, `--warm-gray`
- Gradients: `--gradient-warm`, `--gradient-spice`, `--gradient-earth`
- Glass effect: `.glass-card` class for backdrop-blur cards

Button styles use `.btn-primary` with gradient and hover shine effect.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Admin Access

1. Navigate to `/admin/login`
2. Login requires a user with `is_admin = true` in the `profiles` table
3. Dashboard at `/admin/dashboard` for market CRUD operations
4. "Seed Sample Data" button adds 6 demo markets and 9 offers
