import WorkspaceNavigation from './WorkspaceNavigation';
import Link from 'next/link';
export default function WorkspaceShell({children,primary=false,subpage=false}:{children:React.ReactNode;primary?:boolean;subpage?:boolean}){
 return <div className="workspace-shell"><header><Link className="workspace-brand" href="/" aria-label="Ryvix home"><span aria-hidden="true">✦</span> RYVIX</Link>{!subpage&&<WorkspaceNavigation primary={primary}/>}</header>{children}</div>;
}
