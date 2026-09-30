# ADR-018: Protect operational records and require current membership

Historical FOR ALL policies allowed browser mutations of project/environment and
operational evidence records. In particular, a viewer could bypass backend routes
and delete a project, cascading its data, or forge an audit event. The supported
application writes these records through authorized backend/worker paths.

Revoke browser INSERT/UPDATE/DELETE on projects, environments, membership, API keys,
server/service inventory, security/incidents/recovery records, plan/tool records,
health checks and audit events. Preserve current read policies. The remaining
web operation audit helper now verifies project access, then locks/rechecks current
operator membership and inserts through the server-only database pool. Backend
service-role audit writes remain supported.

Add restrictive current-membership policies on projects, organizations, membership
and API keys. Existing project-derived RLS subqueries then require a current
membership, rather than allowing access from a stale profile organization alone.
The existing SECURITY DEFINER organization helper avoids policy recursion. Profile
display-field edits remain supported. Organization updates require an actual
owner/admin membership rather than a potentially stale profile role.

This does not certify every historical route, function or policy. Durable approval
and authenticated command dispatch remain separate work; audit records alone are
not execution approval or proof of successful execution.
