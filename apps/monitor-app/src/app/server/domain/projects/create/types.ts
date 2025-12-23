export type CreateProjectInput = {
  name: string;
  slug: string;
};

export type CreateProjectResult =
  | { kind: 'ok'; projectId: string }
  | { kind: 'error'; message: string }
  | { kind: 'already-exists'; slug: string };
