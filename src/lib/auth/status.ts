import { createServerFn } from "@tanstack/react-start";

export const getAuthMethods = createServerFn({ method: "GET" }).handler(async () => {
  const { googleAuthConfigured } = await import("./server");
  return { google: googleAuthConfigured };
});
