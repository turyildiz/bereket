This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Supabase Setup (Admin Panel)

To enable the Admin authentication features, you need to configure Supabase:

1. Create a Supabase project at [supabase.com](https://supabase.com)

2. Create a `.env.local` file in the project root:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Create the `profiles` and `markets` tables in your Supabase database:
```sql
-- Profiles table (for admin access control)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: users can read their own profile
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Markets table
CREATE TABLE markets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  whatsapp_numbers TEXT[] DEFAULT '{}',
  header_url TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on markets
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated admins
CREATE POLICY "Admins can manage markets" 
ON markets FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);
```

4. Create an admin user:
   - Go to Supabase Dashboard → Authentication → Users → Add user
   - After creating the user, insert a profile with `is_admin = true`:
   ```sql
   INSERT INTO profiles (id, email, is_admin) 
   VALUES ('user-uuid-here', 'admin@example.com', true);
   ```

5. Access the admin panel at `/admin/login`

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
