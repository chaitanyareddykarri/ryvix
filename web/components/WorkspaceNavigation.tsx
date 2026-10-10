import Link from 'next/link';
import ApplicationNavigation from './ApplicationNavigation';
export default function WorkspaceNavigation({primary=false}:{primary?:boolean}){
 const groups=[
  ['Operate',[['/deployments','Deployments'],['/releases','Release approvals'],['/server-approvals','Server Approvals'],['/notifications','Email notifications'],['/servers','Servers'],['/servers/tools','Server tools']]],
  ['Knowledge and learning',[['/repositories','Repository inspection'],['/knowledge','Repository knowledge'],['/experience','Memory and reviewed lessons'],['/learning','Classifier training'],['/learning/external','External training exports']]],
  ['Account and usage',[['/profile/whatsapp','Phone / Telegram'],['/team','Team and organizations'],['/usage','AI usage'],['/channels','Channels']]],
 ] as const;
 const tools=<details><summary>Workspace tools</summary><div className="workspace-menu">
   {groups.map(([label,links])=><section key={label}><h3>{label}</h3>{links.map(([href,title])=><Link key={href} href={href}>{title}</Link>)}</section>)}
  </div></details>;
 if(primary)return <div className="workspace-navigation"><ApplicationNavigation>{tools}</ApplicationNavigation></div>;
 return <nav aria-label="Workspace navigation" className="workspace-navigation">
  <Link href="/dashboard">Console</Link>{tools}
 </nav>;
}
