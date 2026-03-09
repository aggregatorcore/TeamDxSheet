-- Fix: "Database error creating new user"
-- Run in Supabase Dashboard → SQL Editor → New query

-- Drop BOTH trigger names (MCP may use teamdx_ prefix)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS teamdx_on_auth_user_created ON auth.users;

-- Drop the function (CASCADE removes any dependent triggers)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 3: Verify - run this, should return 0 rows:
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND tgname = 'on_auth_user_created';

-- Now create users via Dashboard or: npm run create-user email@example.com password telecaller
