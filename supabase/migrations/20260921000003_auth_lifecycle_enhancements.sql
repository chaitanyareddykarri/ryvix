-- ==============================================================================
-- RYVIX AUTHENTICATION & MULTI-TENANT LIFECYCLE ENHANCEMENT MIGRATION (PHASE 3)
-- Enhances user onboarding trigger with idempotency, multi-org membership sync,
-- and defensive error recovery without altering existing data.
-- ==============================================================================

-- Recreate or update handle_new_user with idempotency and organization_members linking
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_org_id UUID;
    clean_name TEXT;
    clean_slug TEXT;
BEGIN
    -- 1. Extract sanitized display name
    clean_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        SPLIT_PART(NEW.email, '@', 1),
        'User'
    );

    -- 2. Deterministic, collision-resistant workspace slug
    clean_slug := 'org-' || SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 12);

    -- 3. Idempotently create personal tenant organization
    INSERT INTO public.organizations (name, slug)
    VALUES (clean_name || '''s Workspace', clean_slug)
    ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
    RETURNING id INTO new_org_id;

    -- If org was already present and returned empty, fetch existing id
    IF new_org_id IS NULL THEN
        SELECT id INTO new_org_id FROM public.organizations WHERE slug = clean_slug LIMIT 1;
    END IF;

    -- 4. Idempotently create user profile
    INSERT INTO public.profiles (id, organization_id, full_name, role)
    VALUES (NEW.id, new_org_id, clean_name, 'owner')
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        updated_at = NOW();

    -- 5. Sync into multi-tenant organization_members table (from Phase 2 schema)
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'organization_members'
    ) THEN
        INSERT INTO public.organization_members (organization_id, user_id, role)
        VALUES (new_org_id, NEW.id, 'owner')
        ON CONFLICT (organization_id, user_id) DO NOTHING;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Defensive error handling: log warning but never break auth user creation
        RAISE WARNING 'handle_new_user encountered an exception: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
