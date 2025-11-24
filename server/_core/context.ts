import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Usuário fixo sem autenticação OAuth
  const user: User = {
    id: "1",
    openId: "fixed-user",
    name: "Usuário GRC",
    email: "usuario@grc.com",
    avatarUrl: null,
    loginMethod: "none",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
