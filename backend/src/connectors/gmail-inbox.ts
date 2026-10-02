import type {Pool} from 'pg';
import {ChannelAccounts,channelProviderJson} from '../services/channel-accounts';
import {ChannelInbox,ChannelError} from '../services/channel-inbox';

export async function pollGmail(pool:Pool,org:string,user:string,id:string) {
  const account=await new ChannelAccounts(pool).credential(org,user,id);
  if(account.connector_type!=='gmail'||!account.cursor)throw new ChannelError('Gmail connection cursor unavailable.',409);
  const credentials=JSON.parse(account.decrypted_secret);
  const token=await channelProviderJson('https://oauth2.googleapis.com/token',{method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.GMAIL_CLIENT_ID||'',client_secret:process.env.GMAIL_CLIENT_SECRET||'',refresh_token:credentials.refresh_token,grant_type:'refresh_token'})});
  if(typeof token.access_token!=='string')throw new ChannelError('Gmail refresh failed.',502);
  const headers={Authorization:`Bearer ${token.access_token}`};
  const signal=AbortSignal.timeout(90000);
  let page:string|undefined,cursor=account.cursor,received=0;const ids=new Set<string>();
  for(let count=0;count<10;count++){
    const params=new URLSearchParams({startHistoryId:account.cursor,historyTypes:'messageAdded',maxResults:'100'});if(page)params.set('pageToken',page);
    const history=await channelProviderJson(`https://gmail.googleapis.com/gmail/v1/users/me/history?${params}`,{headers,signal});
    for(const entry of history.history||[])for(const added of entry.messagesAdded||[])if(typeof added.message?.id==='string')ids.add(added.message.id);
    if(ids.size>100)throw new ChannelError('Mailbox batch exceeds 100 messages; reconnect after reviewing backlog.',409);
    cursor=history.historyId;page=history.nextPageToken;if(!page)break;
  }
  if(page||typeof cursor!=='string'||!/^\d+$/.test(cursor))throw new ChannelError('Gmail history incomplete; cursor retained.',502);
  for(const messageId of ids){
    const message=await channelProviderJson(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=full`,{headers,signal});
    if(!message.labelIds?.includes('INBOX')||message.labelIds.some((label:string)=>['SPAM','TRASH','DRAFT'].includes(label)))continue;
    const header=(name:string)=>(message.payload?.headers||[]).find((item:any)=>item.name.toLowerCase()===name)?.value || '';
    let text='';function visit(part:any,depth=0){if(!part||depth>8)return;if(part.mimeType==='text/plain'&&typeof part.body?.data==='string')text+=Buffer.from(part.body.data,'base64url').toString('utf8');
      for(const child of (part.parts||[]).slice(0,20))visit(child,depth+1);}
    visit(message.payload);const content=`${header('subject')}\n\n${text}`.trim().slice(0,10000);if(!content)continue;
    const result=await new ChannelInbox(pool).receive(id,messageId,header('from').slice(0,320)||'Unknown sender',content);received+=Number(result.inserted);
  }
  // Compare-and-swap prevents concurrent polls from moving the cursor backwards.
  await pool.query('UPDATE channel_accounts SET cursor=$3 WHERE connector_id=$1 AND cursor=$2',[id,account.cursor,cursor]);
  return {received,reviewRequired:true};
}
