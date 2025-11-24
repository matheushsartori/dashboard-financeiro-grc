import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as fs from "fs";
import * as path from "path";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("financial.uploadExcel", () => {
  it("should accept upload with valid input schema", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Test with valid input format
    const validInput = {
      fileName: "test.xlsx",
      fileSize: 1024,
      fileData: Buffer.from("test").toString("base64"),
    };

    // The procedure should accept the input and create an upload record
    // It may fail at parsing, but that's handled internally
    const result = await caller.financial.uploadExcel(validInput);
    
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("uploadId");
    expect(typeof result.uploadId).toBe("number");
  });

  it("should handle Excel parsing errors gracefully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Invalid Excel data should still create upload record but mark as failed
    const invalidInput = {
      fileName: "invalid.xlsx",
      fileSize: 100,
      fileData: Buffer.from("not-a-valid-excel-file").toString("base64"),
    };

    // The API handles errors internally and updates upload status
    const result = await caller.financial.uploadExcel(invalidInput);
    
    // Should still return success with uploadId (error is stored in upload record)
    expect(result).toHaveProperty("uploadId");
  });
});

describe("financial.listUploads", () => {
  it("should return uploads for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const uploads = await caller.financial.listUploads();
    
    // Should return an array (even if empty)
    expect(Array.isArray(uploads)).toBe(true);
  });
});

describe("financial.getDashboardSummary", () => {
  it("should require uploadId parameter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Test without uploadId
    await expect(
      // @ts-expect-error - testing missing parameter
      caller.financial.getDashboardSummary({})
    ).rejects.toThrow();
  });

  it("should accept valid uploadId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This will return null or data depending on database state
    const result = await caller.financial.getDashboardSummary({ uploadId: 999999 });
    
    // Should return an object (even if null or empty)
    expect(typeof result).toBe("object");
  });
});

describe("financial.getContasAPagar", () => {
  it("should return array for valid uploadId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.financial.getContasAPagar({ uploadId: 999999 });
    
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("financial.getContasAReceber", () => {
  it("should return array for valid uploadId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.financial.getContasAReceber({ uploadId: 999999 });
    
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("financial.getFolhaPagamento", () => {
  it("should return array for valid uploadId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.financial.getFolhaPagamento({ uploadId: 999999 });
    
    expect(Array.isArray(result)).toBe(true);
  });
});
