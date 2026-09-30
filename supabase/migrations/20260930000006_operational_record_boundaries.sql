BEGIN;
REVOKE INSERT,UPDATE,DELETE ON public.projects,public.environments,
  public.organization_members,public.api_keys,public.servers,public.services_inventory,
  public.security_events,public.incidents,public.recovery_plans,public.recovery_runs,
  public.plan_steps,public.tool_calls,public.health_checks,public.audit_events
  FROM PUBLIC,anon,authenticated;

CREATE POLICY projects_current_membership ON public.projects AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (organization_id=(SELECT public.current_member_organization()))
  WITH CHECK (organization_id=(SELECT public.current_member_organization()));
CREATE POLICY organizations_current_membership ON public.organizations AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (id=(SELECT public.current_member_organization()))
  WITH CHECK (id=(SELECT public.current_member_organization()));
CREATE POLICY members_current_membership ON public.organization_members AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (organization_id=(SELECT public.current_member_organization()))
  WITH CHECK (organization_id=(SELECT public.current_member_organization()));
CREATE POLICY api_keys_current_membership ON public.api_keys AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (organization_id=(SELECT public.current_member_organization()))
  WITH CHECK (organization_id=(SELECT public.current_member_organization()));

DROP POLICY org_owner_update ON public.organizations;
CREATE POLICY org_owner_update ON public.organizations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organization_members m
    WHERE m.organization_id=organizations.id AND m.user_id=auth.uid() AND m.role IN ('owner','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m
    WHERE m.organization_id=organizations.id AND m.user_id=auth.uid() AND m.role IN ('owner','admin')));
COMMIT;
