import { resetProjectData } from "@/app/server/lib/clickhouse/repositories/projects-repository";
import { getAuthorizedSession } from "@/lib/auth-utils";

export class ProjectsResetService {
async execute(projectId: string) {
    try {
        const session = await getAuthorizedSession();
        if (session.kind === "unauthorized") return { kind: 'unauthorized' as const };

        await resetProjectData(projectId);
        return { kind: 'ok' as const };
    } catch (error) {
        console.error("Reset Project Service Error:", error);
        return { kind: 'error' as const, message: 'Failed to reset project data.' };
    }
}
}

export const projectsResetService = new ProjectsResetService();