import Link from "next/link";
import { SearchX } from "lucide-react";
export function EmptyState({title="Nothing here yet",description="Try adjusting your filters or explore more spaces.",href="/studios",cta="Explore studios"}:{title?:string;description?:string;href?:string;cta?:string}){return <div className="empty-state"><span className="empty-icon"><SearchX size={28}/></span><h3>{title}</h3><p>{description}</p><Link className="btn btn-dark" href={href}>{cta}</Link></div>}
