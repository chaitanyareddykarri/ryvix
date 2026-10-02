import { NextResponse } from 'next/server';
import { requireTenant, RequestError } from '@/utils/tenant-context';
import { queryDirectDb } from '@/utils/direct-db';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const {organizationId,user} = await requireTenant();
    const id = new URL(request.url).searchParams.get('id');
    const headers = {'Cache-Control':'no-store'};
    if (id) {
      if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) throw new RequestError('Invalid conversation.',400);
      const owned = await queryDirectDb(`SELECT c.id FROM chat_conversations c JOIN organization_members m
        ON m.organization_id=c.organization_id AND m.user_id=c.user_id
        WHERE c.id=$1 AND c.organization_id=$2 AND c.user_id=$3`,[id,organizationId,user.id]);
      if (!owned.length) throw new RequestError('Conversation unavailable.',404);
      const turns = await queryDirectDb(`SELECT t.id::text,t.question,t.answer,t.created_at FROM chat_turns t
        JOIN chat_conversations c ON c.id=t.conversation_id JOIN organization_members m
        ON m.organization_id=c.organization_id AND m.user_id=c.user_id
        WHERE c.id=$1 AND c.organization_id=$2 AND c.user_id=$3 AND t.created_at>now()-interval '30 days'
        ORDER BY t.id DESC LIMIT 100`,[id,organizationId,user.id]);
      return NextResponse.json({conversationId:id,turns:turns.reverse()},{headers});
    }
    const conversations = await queryDirectDb(`SELECT c.id,c.created_at,COALESCE(last_turn.title,'New conversation') AS title
      FROM chat_conversations c JOIN organization_members m ON m.organization_id=c.organization_id AND m.user_id=c.user_id
      LEFT JOIN LATERAL (SELECT left(question,100) AS title,created_at FROM chat_turns
        WHERE conversation_id=c.id AND created_at>now()-interval '30 days' ORDER BY id DESC LIMIT 1) last_turn ON true
      WHERE c.organization_id=$1 AND c.user_id=$2 AND
        (c.created_at>now()-interval '30 days' OR last_turn.created_at IS NOT NULL)
      ORDER BY COALESCE(last_turn.created_at,c.created_at) DESC LIMIT 50`,[organizationId,user.id]);
    const repositories=await queryDirectDb(`SELECT r.id,r.full_name FROM repositories r JOIN projects p ON p.id=r.project_id
      JOIN organization_members m ON m.organization_id=p.organization_id WHERE p.organization_id=$1
      AND m.user_id=$2 AND m.role IN ('owner','admin','developer') ORDER BY r.full_name LIMIT 100`,[organizationId,user.id]);
    return NextResponse.json({conversations,repositories},{headers});
  } catch(error) {
    return NextResponse.json({error:error instanceof RequestError ? error.message : 'Conversation history unavailable.'},
      {status:error instanceof RequestError ? error.status : 503});
  }
}
