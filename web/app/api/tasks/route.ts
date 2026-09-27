import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { generateTaskPlan } from "@ryvix/ai";
import { dockerWorkspaceManager } from "@ryvix/services";
import { requireProjectOperator, operationAuthorization } from "@/utils/operation-access";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ tasks: [] });
    }

    // Tenant isolation: Fetch user's organization projects
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    let projectIds: string[] = [];
    if (profile?.organization_id) {
      const { data: projs } = await supabase
        .from("projects")
        .select("id")
        .eq("organization_id", profile.organization_id);
      if (projs && projs.length > 0) {
        projectIds = projs.map((p) => p.id);
      }
    }

    // Only query tasks belonging to this user or their organization projects
    let query = supabase
      .from("tasks")
      .select("*, plans:plans!plans_task_id_fkey(*)")
      .order("created_at", { ascending: false })
      .limit(20);

    if (projectIds.length > 0) {
      query = query.or(`created_by.eq.${user.id},project_id.in.(${projectIds.join(",")})`);
    } else {
      query = query.eq("created_by", user.id);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.warn("[Tasks GET Notice]:", error.message);
      let fallbackQuery = supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (projectIds.length > 0) {
        fallbackQuery = fallbackQuery.or(`created_by.eq.${user.id},project_id.in.(${projectIds.join(",")})`);
      } else {
        fallbackQuery = fallbackQuery.eq("created_by", user.id);
      }

      const { data: fallbackTasks } = await fallbackQuery;
      return NextResponse.json({ tasks: fallbackTasks || [] });
    }

    return NextResponse.json({ tasks: tasks || [] });
  } catch (err: unknown) {
    console.error("[Tasks GET Fatal Error]:", err);
    return NextResponse.json({ tasks: [] });
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const prompt = body.prompt?.trim();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // 1. Fetch user's profile to get organization_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const orgId = profile?.organization_id;

    // 2. Resolve or create default Project
    let projectId = body.projectId;
    if (!projectId && orgId) {
      const { data: existingProj } = await supabase
        .from("projects")
        .select("id")
        .eq("organization_id", orgId)
        .limit(1)
        .single();

      if (existingProj) {
        projectId = existingProj.id;
      } else {
        const { data: newProj } = await supabase
          .from("projects")
          .insert({
            organization_id: orgId,
            name: "Primary Workspace",
            slug: `workspace-${Date.now().toString().slice(-6)}`,
            environment: "development",
          })
          .select("id")
          .single();
        projectId = newProj?.id;
      }
    }

    if (!projectId) return NextResponse.json({ error: "A project is required" }, { status: 400 });
    await requireProjectOperator(supabase, user.id, projectId);

    // 3. AI Reasoning: Generate structured plan
    const aiPlan = await generateTaskPlan({
      taskId: `task_${Date.now()}`,
      projectId: projectId || "proj_default",
      userPrompt: prompt,
      projectContext: {
        stack: ["nextjs", "typescript"],
        framework: "Next.js",
        language: "typescript",
      },
    });

    // 4. Create Task in PostgreSQL
    let createdTaskId = `task_${Date.now()}`;
    if (projectId) {
      const { data: taskRecord, error: taskError } = await supabase
        .from("tasks")
        .insert({
          project_id: projectId,
          created_by: user.id,
          channel: "web",
          task_type: "coding",
          status: "awaiting_approval",
          user_prompt: prompt,
          summary: aiPlan.planTitle,
        })
        .select("id")
        .single();

      if (taskError || !taskRecord) throw new Error("Failed to persist task");
      if (taskRecord) {
        createdTaskId = taskRecord.id;
      }
    }

    // 5. Spin up ephemeral Docker Sandbox Session
    const audit = operationAuthorization(supabase, user.id, projectId);
    await audit.recordAudit({ action: "workspace.create", target: createdTaskId, status: "requested" });
    const sandboxSession = await dockerWorkspaceManager.createSession(
      createdTaskId,
      projectId || "proj_default",
      "node:22-alpine",
      15
    );
    await audit.recordAudit({ action: "workspace.create", target: sandboxSession.id, status: "success" });

    return NextResponse.json({
      success: true,
      task: {
        id: createdTaskId,
        prompt,
        status: "awaiting_approval",
        title: aiPlan.planTitle,
      },
      steps: aiPlan.steps,
      workspace: {
        sessionId: sandboxSession.id,
        previewUrl: sandboxSession.preview_url,
        previewPort: sandboxSession.preview_port,
        status: sandboxSession.status,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Task creation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient(await cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const { taskId, status } = body;

    if (!taskId || !status) {
      return NextResponse.json({ error: "taskId and status are required" }, { status: 400 });
    }

    const { data: task, error } = await supabase.from("tasks")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", taskId).eq("created_by", user.id).select("id").maybeSingle();
    if (error) throw error;
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    return NextResponse.json({ success: true, taskId, status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    // Foreign-key cascades remove dependent rows only after the authorized delete.
    const { data: task, error } = await supabase.from("tasks").delete()
      .eq("id", taskId).eq("created_by", user.id).select("id").maybeSingle();
    if (error) throw error;
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    return NextResponse.json({ success: true, taskId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete task" }, { status: 500 });
  }
}
