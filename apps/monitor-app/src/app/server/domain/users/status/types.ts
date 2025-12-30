import { type as arkType } from "arktype";

export const toggleStatusSchema = arkType({
  userId: "string > 0",
  currentStatus: "string | null | undefined",
});