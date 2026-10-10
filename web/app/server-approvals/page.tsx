import Link from 'next/link';
import styles from '@/components/InfrastructureSettings.module.css';
export default function ServerApprovalsPage(){
  return <main className={styles.page}>
    <h1>Server Approvals</h1>
    <p>Review service operations and cloud recovery requests. A different owner or administrator must approve each request before execution.</p>
    <section className={`workspace-card ${styles.card}`}>
      <h2>Server operation approvals</h2>
      <p>Request a restart of an allowed service and review signed execution results.</p>
      <Link className="workspace-button" href="/operations">Open server operation approvals →</Link>
    </section>
    <section className={`workspace-card ${styles.card}`}>
      <h2>Cloud recovery approvals</h2>
      <p>Request an instance reboot and review provider acceptance and measured recovery observations.</p>
      <Link className="workspace-button" href="/recovery">Open cloud recovery approvals →</Link>
    </section>
  </main>;
}
