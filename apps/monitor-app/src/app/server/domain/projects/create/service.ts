import { createProject, getProjectBySlug } from '@/app/server/lib/clickhouse/repositories/projects-repository';
import { getAuthorizedSession } from '@/app/server/lib/auth-check';
import { CreateProjectInput, CreateProjectResult } from '@/app/server/domain/projects/create/types';
import { randomUUID } from 'node:crypto';

export class CreateProjectService {
  async execute(input: CreateProjectInput): Promise<CreateProjectResult> {
    await getAuthorizedSession();
    const existing = await getProjectBySlug(input.slug);
    if (existing) return { kind: 'already-exists', slug: input.slug };

    const projectId = randomUUID();
    await createProject({
      id: projectId,
      name: input.name,
      slug: input.slug
    });

    return { kind: 'ok', projectId };
  }
}
