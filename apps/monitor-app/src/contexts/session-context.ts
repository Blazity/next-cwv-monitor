import { SessionData } from "@/lib/auth-client";
import { createContext } from "react";

export const SessionContext = createContext<SessionData | null | undefined>(undefined);
