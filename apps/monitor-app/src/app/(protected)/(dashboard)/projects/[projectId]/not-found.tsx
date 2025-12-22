import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <p className="text-muted-foreground mb-4">Route not found</p>
      <Link href="/projects" className="text-foreground flex items-center gap-2 text-sm hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>
    </div>
  );
}
