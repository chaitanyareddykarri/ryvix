import WorkspaceNavigation from './WorkspaceNavigation';
import Link from 'next/link';
export default function WorkspaceShell({children}:{children:React.ReactNode}){
 return <div className="workspace-shell"><header><Link className="workspace-brand" href="/" aria-label="Ryvix home"><span aria-hidden="true">✦</span> RYVIX</Link><WorkspaceNavigation/></header>{children}</div>;
}
