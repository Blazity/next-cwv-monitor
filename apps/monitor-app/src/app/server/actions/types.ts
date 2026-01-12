export type ActionResponse<TErrors = Record<string, string[]>> =
  | { success: boolean; message?: string; errors?: TErrors };

export type AlterProjectErrors = {
    name?: string[];
    domain?: string[];
}