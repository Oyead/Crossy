// Mock user database — shared between signup API and NextAuth authorize.
// In production, replace with a real database.
export interface MockUser {
  id: string;
  name: string;
  email: string;
  credentials: unknown[];
}

export const users = new Map<string, MockUser>([
  ["1", { id: "1", name: "J Smith", email: "jsmith@example.com", credentials: [] }],
]);
