BEGIN;
CREATE FUNCTION public.current_member_organization() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT p.organization_id FROM public.profiles p
  JOIN public.organization_members m ON m.organization_id=p.organization_id AND m.user_id=p.id
  WHERE p.id=auth.uid() LIMIT 1 $$;
REVOKE ALL ON FUNCTION public.current_member_organization() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.current_member_organization() TO authenticated,service_role;

DROP POLICY IF EXISTS profile_view_org ON public.profiles;
CREATE POLICY profile_view_org ON public.profiles FOR SELECT TO authenticated
  USING (id=auth.uid() OR organization_id=public.current_member_organization());
REVOKE INSERT,UPDATE,DELETE ON public.profiles FROM PUBLIC,anon,authenticated;
GRANT UPDATE(full_name,avatar_url,phone_number) ON public.profiles TO authenticated;

REVOKE INSERT,UPDATE,DELETE ON public.tasks,public.plans,public.approval_requests,
  public.workspace_sessions,public.pull_requests FROM PUBLIC,anon,authenticated;
COMMIT;
