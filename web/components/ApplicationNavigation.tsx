'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import styles from './ApplicationNavigation.module.css';
const sections=[['/servers','Servers'],['/observability','Observability'],['/tasks','Tasks'],['/server-approvals','Server Approvals'],['/notifications','Security Emails']] as const;
export default function ApplicationNavigation({children}:{children?:React.ReactNode}){
  const pathname=usePathname();
  const section=pathname==='/operations'||pathname==='/recovery'?'/server-approvals':pathname;
  return <div className={styles.frame}>
    <nav className={styles.sections} aria-label="Primary navigation">
      {sections.map(([href,label])=><Link key={href} href={href} aria-current={pathname===href?'page':section===href||section?.startsWith(href+'/')?'location':undefined}>{label}</Link>)}
    </nav>
    <div className={styles.actions}>{children}<Link className={styles.return} href="/">↩ Return to Dashboard</Link></div>
  </div>;
}
