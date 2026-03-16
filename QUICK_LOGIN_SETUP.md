# Quick Login Setup Instructions

## Overview
Quick Login allows household members to access the app using a memorable URL and passphrase, without requiring email access. Perfect for devices where email is difficult to access (like work computers).

## How It Works
1. **Owner sets up Quick Login** in Settings
2. **Creates memorable URL**: e.g., `yourapp.com/quick/neil-family`
3. **Auto-generates 4-word passphrase**: e.g., `eagle-sunset-compass-harmony`
4. **Family members bookmark** the URL
5. **Login once per device** (every 6 months) by entering the passphrase

## Setup Steps

### 1. Apply Database Migration
The migration file has been created at: `supabase/migrations/010_add_quick_login.sql`

**Option A: Using Supabase CLI** (if installed):
```bash
supabase db push
```

**Option B: Using Supabase Dashboard**:
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/010_add_quick_login.sql`
4. Run the migration

### 2. Set Environment Variables

Add these to your `.env.local` file:

```bash
# Required: Service role key for creating sessions without email
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional: Full app URL for generating quick login URLs
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

**Getting your Service Role Key**:
1. Go to Supabase Dashboard → Settings → API
2. Find "Service Role" key (marked as secret)
3. Copy it to your `.env.local` file

**Security Note**: The service role key is sensitive! Never commit it to git or expose it client-side.

### 3. Restart Development Server
```bash
npm run dev
```

## Usage

### For Owners:
1. Go to **Settings** page
2. Find the **Quick Login** section
3. Click "Set Up Quick Login"
4. Enter:
   - **Slug**: Memorable URL part (e.g., `neil-family`)
   - **Passphrase**: Auto-generated 4-word phrase (e.g., `eagle-sunset-compass-harmony`)
     - Click "New" to generate a different one if you don't like it
     - Or edit/type your own custom passphrase
5. Copy the generated URL
6. Share it with household members to bookmark

### For Users:
1. **Bookmark the URL**: Save it in your browser
2. **Visit the URL**: Open the bookmark
3. **Enter passphrase**: Type the household passphrase
4. **You're in!**: Session lasts 6 months

## Security Features

- **Rate Limiting**: 5 attempts per 15 minutes per slug/IP
- **Passphrase Hashing**: Using bcrypt (secure one-way encryption)
- **Attempt Logging**: All login attempts tracked for security auditing
- **Owner-Only Setup**: Only household owners can configure quick login
- **Unique Slugs**: Each slug can only be used by one household

## Architecture

### Database Tables
- `households` - Added `quick_login_slug` and `quick_login_passphrase_hash`
- `quick_login_attempts` - Tracks login attempts for security

### API Routes
- `GET /api/household/quick-login` - Get current config
- `POST /api/household/quick-login` - Set up/update quick login
- `DELETE /api/household/quick-login` - Disable quick login
- `POST /api/quick-login` - Authenticate with passphrase

### UI Pages
- `/quick/[slug]` - Quick login page (passphrase form)
- `/settings` - Quick login configuration (owner only)

### Key Files
- `supabase/migrations/010_add_quick_login.sql` - Database migration
- `src/app/api/household/quick-login/route.ts` - Configuration API
- `src/app/api/quick-login/route.ts` - Authentication API
- `src/app/quick/[slug]/page.tsx` - Login page UI
- `src/app/settings/page.tsx` - Settings UI (Quick Login section)
- `src/middleware.ts` - Updated to allow `/quick/*` routes

## Troubleshooting

### "Quick login is not properly configured"
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Restart the dev server after adding env vars

### "Slug is already taken"
- Each slug must be unique across all households
- Try a different slug name

### "Invalid passphrase" but it's correct
- Check for extra spaces or typos
- Passphrases are case-sensitive
- If you forgot it, owner can set up a new one in Settings

### "Too many attempts"
- Wait 15 minutes before trying again
- Rate limiting protects against brute force attacks

### Migration errors
- Check that all previous migrations have been applied
- Ensure database connection is working
- Try running migrations one at a time

## Maintenance

### Viewing Login Attempts
Query the `quick_login_attempts` table to see security audit log:
```sql
SELECT * FROM quick_login_attempts
WHERE slug = 'your-slug'
ORDER BY attempted_at DESC
LIMIT 100;
```

### Cleanup Old Attempts
Run the cleanup function (keeps last 30 days):
```sql
SELECT cleanup_old_quick_login_attempts();
```

### Disable for a Household
As owner, go to Settings → Quick Login → "Disable Quick Login"

### Change Passphrase
As owner, go to Settings → Quick Login → "Change URL/Passphrase"

## Benefits

✅ **No email required** - Perfect for work computers where personal email is blocked
✅ **Memorable** - URLs and passphrases designed to be human-friendly
✅ **Bookmarkable** - Save once, use forever
✅ **Secure** - Rate limiting, hashing, audit logs
✅ **Long sessions** - Login once every 6 months per device
✅ **Family-friendly** - Whole household shares same credentials

## Example Use Case

**Problem**: Your wife can't access Gmail from her work computer, so she can't receive magic link emails.

**Solution**:
1. You (as owner) set up quick login with slug `neil-family`
2. Auto-generated passphrase: `eagle-sunset-compass-harmony` (memorable and easy to type!)
   - Don't like it? Click "New" to generate another like `ocean-tiger-castle-wisdom`
3. URL becomes: `https://yourapp.com/quick/neil-family`
4. She bookmarks this URL on her work computer
5. Visits URL, enters `eagle-sunset-compass-harmony`, logged in for 6 months
6. No email needed! 🎉
