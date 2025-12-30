import { type as arkType } from "arktype";

export const deleteUserSchema = arkType({
  userId: "string > 0",
});