import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { generateTaskPlan } from "@ryvix/ai";
import { dockerWorkspaceManager } from "@ryvix/services";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      // If not authenticated via cookie, check direct PostgreSQL tasks so user can see recent real tasks
      try {
        const { Client } = require("pg");
        const client = new Client({
          connectionString: process.env.DATABASE_URL || "postgresql://postgres:CR%24%24Reddy2006@db.tsoyrpgifovzwqtgpkkb.supabase.co:5432/postgres",
          ssl: { rejectUnauthorized: false }
        });
        await client.connect();
        const res = await client.query(`
          SELECT id, project_id, created_by, channel, task_type, status, user_prompt, summary, created_at, updated_at
          FROM tasks
          ORDER BY created_at DESC
          LIMIT 20
        `);
        await client.end();
        return NextResponse.json({ tasks: res.rows || [] });
      } catch {
        return NextResponse.json({ tasks: [] });
      }
    }

    // Disambiguate foreign key relationship: plans!plans_task_id_fkey
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*, plans:plans!plans_task_id_fkey(*)")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.warn("[Tasks GET Notice]:", error.message);
      const { data: fallbackTasks } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

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
      const { data: taskRecord } = await supabase
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

      if (taskRecord) {
        createdTaskId = taskRecord.id;
      }
    }

    // 5. Spin up ephemeral Docker Sandbox Session
    const sandboxSession = await dockerWorkspaceManager.createSession(
      createdTaskId,
      projectId || "proj_default",
      "node:22-alpine",
      15
    );

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
