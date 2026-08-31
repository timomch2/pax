import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      tier?: string;
      additionalRoles?: string[];
      permissionVersion?: number;
    };
  }
  interface User {
    role: string;
    additionalRoles?: string[];
    sessionVersion?: number;
    permissionVersion?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
    id: string;
    tier?: string;
    additionalRoles?: string[];
    sessionVersion?: number;
    permissionVersion?: number;
    authInvalid?: boolean;
  }
}
