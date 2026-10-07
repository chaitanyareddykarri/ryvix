import Link from 'next/link';
export default function WorkspaceNavigation(){
 const groups=[
  ['Operate',[['/deployments','Deployments'],['/releases','Release approvals'],['/operations','Service operations'],['/recovery','Cloud recovery'],['/notifications','Email notifications'],['/servers','Servers'],['/servers/tools','Server tools']]],
  ['Knowledge and learning',[['/repositories','Repository inspection'],['/knowledge','Repository knowledge'],['/experience','Memory and reviewed lessons'],['/learning','Classifier training'],['/learning/external','External training exports']]],
  ['Account and usage',[['/profile/whatsapp','Phone / WhatsApp'],['/team','Team and organizations'],['/usage','AI usage'],['/channels','Channels']]],
 ] as const;
 return <nav aria-label="Workspace navigation" className="workspace-navigation">
  <Link href="/dashboard">Dashboard</Link>
  <details><summary>Workspace tools</summary><div className="workspace-menu">
   {groups.map(([label,links])=><section key={label}><h3>{label}</h3>{links.map(([href,title])=><Link key={href} href={href}>{title}</Link>)}</section>)}
  </div></details>
 </nav>;
}
