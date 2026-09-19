import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { logAuditRaw } from '@/lib/audit';
import { enforceIdentifierRateLimit } from '@/lib/rate-limit';
import { verifyAndConsumeSecondFactor } from '@/lib/mfa';
import { safeReturnUrl, sharedSessionCookie, talentEnabled } from '@/lib/product-hosts';

export const dynamic = 'force-dynamic';

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

export const authOptions: NextAuthOptions = {
  adapter: {
    ...PrismaAdapter(prisma),
    ...(talentEnabled() ? { createUser: async (data: { name?: string | null; email: string; emailVerified: Date | null; image?: string | null }) => {
      const role = await prisma.accessRole.findUniqueOrThrow({ where: { key: 'MEMBER' } });
      return prisma.user.create({ data: { ...data, name: data.name || 'PAX member', role: 'MEMBER', accessRoleAssignments: { create: { accessRoleId: role.id, scope: 'OWN' } }, notificationPreference: { create: {} } } });
    } } : {}),
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: false,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        otp: { label: 'Authentication code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        try {
          const normalizedEmail = credentials.email.trim().toLowerCase();
          const rateLimit = await enforceIdentifierRateLimit(
            { name: 'credentials-login', limit: 10, windowSeconds: 15 * 60, blockSeconds: 15 * 60 },
            normalizedEmail,
          );
          if (!rateLimit.allowed) {
            await logAuditRaw({
              actorEmail: normalizedEmail,
              action: 'LOGIN_RATE_LIMITED',
              outcome: 'DENIED',
            });
            return null;
          }
          const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: { practitionerProfile: true },
          });
          if (!user || !user.password) {
            await logAuditRaw({
              actorEmail: normalizedEmail,
              action: 'LOGIN_FAILED',
              outcome: 'FAILURE',
              context: { reason: 'unknown_account' },
            });
            return null;
          }

          if (user.accountStatus !== 'ACTIVE') {
            await logAuditRaw({
              userId: user.id,
              actorEmail: user.email,
              action: 'LOGIN_FAILED',
              outcome: 'DENIED',
              context: { reason: 'account_inactive' },
            });
            return null;
          }
          if (!user.emailVerified) {
            await logAuditRaw({
              userId: user.id,
              actorEmail: user.email,
              action: 'LOGIN_FAILED',
              outcome: 'DENIED',
              context: { reason: 'email_unverified' },
            });
            return null;
          }

          // Account lockout after repeated failures (DPA 2019 s.41 security measures)
          const lockedUntil = (user as any).lockedUntil as Date | null;
          if (lockedUntil && lockedUntil > new Date()) {
            await logAuditRaw({
              userId: user.id,
              actorEmail: user.email,
              action: 'LOGIN_FAILED',
              outcome: 'DENIED',
              context: { reason: 'account_locked', lockedUntil },
            });
            throw new Error('Account temporarily locked. Try again in a few minutes.');
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            const attempts = ((user as any).failedLoginCount ?? 0) + 1;
            const shouldLock = attempts >= MAX_FAILED_LOGINS;
            try {
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  failedLoginCount: shouldLock ? 0 : attempts,
                  lockedUntil: shouldLock
                    ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
                    : null,
                } as any,
              });
            } catch { /* non-blocking */ }
            await logAuditRaw({
              userId: user.id,
              actorEmail: user.email,
              action: shouldLock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
              outcome: 'FAILURE',
              context: { attempts },
            });
            return null;
          }

          if (user.mfaEnabled) {
            const secondFactorValid = Boolean(
              credentials.otp &&
              user.mfaSecret &&
              await verifyAndConsumeSecondFactor(user.id, user.mfaSecret, user.mfaRecoveryCodes, credentials.otp),
            );
            if (!secondFactorValid) {
              await logAuditRaw({
                userId: user.id,
                actorEmail: user.email,
                action: 'MFA_CHALLENGE_FAILED',
                outcome: 'DENIED',
              });
              return null;
            }
          }

          if (((user as any).failedLoginCount ?? 0) > 0 || (user as any).lockedUntil) {
            try {
              await prisma.user.update({
                where: { id: user.id },
                data: { failedLoginCount: 0, lockedUntil: null } as any,
              });
            } catch { /* non-blocking */ }
          }

          await logAuditRaw({
            userId: user.id,
            actorEmail: user.email,
            action: 'LOGIN_SUCCESS',
            context: { role: user.role },
          });
          // Auto-set EMAIL_VERIFIED if emailVerified is set and verificationLevel is still NONE
          if (user.emailVerified && (user as any).verificationLevel === 'NONE') {
            try {
              await prisma.user.update({
                where: { id: user.id },
                data: { verificationLevel: 'EMAIL_VERIFIED' },
              });
            } catch { /* non-blocking */ }
          }
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tier: (user as any).tier,
            additionalRoles: user.additionalRoles,
            sessionVersion: user.sessionVersion,
            permissionVersion: user.permissionVersion,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.sessionStartedAt = Math.floor(Date.now() / 1000);
        token.role = user.role;
        token.id = user.id;
        token.tier = (user as any).tier;
        token.additionalRoles = (user as any).additionalRoles ?? [];
        token.sessionVersion = (user as any).sessionVersion;
        token.permissionVersion = (user as any).permissionVersion;
      }
      if (typeof token.sessionStartedAt === 'number' && Date.now() / 1000 - token.sessionStartedAt >= 8 * 60 * 60) {
        token.authInvalid = true;
        return token;
      }
      // Refresh authorization state on every JWT evaluation so suspensions,
      // revocations and permission changes take effect without waiting for expiry.
      if (token.id || token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: token.id
              ? { id: token.id as string }
              : { email: (token.email as string).trim().toLowerCase() },
          });
          if (dbUser) {
            if (
              dbUser.accountStatus !== 'ACTIVE' ||
              (token.sessionVersion != null && token.sessionVersion !== dbUser.sessionVersion)
            ) {
              token.authInvalid = true;
              return token;
            }
            token.authInvalid = false;
            token.role = dbUser.role;
            token.id = dbUser.id;
            token.tier = (dbUser as any).tier;
            token.additionalRoles = (dbUser as any).additionalRoles ?? [];
            token.sessionVersion = dbUser.sessionVersion;
            token.permissionVersion = dbUser.permissionVersion;
          } else {
            token.authInvalid = true;
          }
        } catch {
          token.authInvalid = true;
        }
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session?.user) {
        if (token.authInvalid) {
          (session as any).user = null;
          return session;
        }
        session.user.role = token.role;
        session.user.id = token.id;
        session.user.tier = token.tier;
        session.user.additionalRoles = token.additionalRoles ?? [];
        session.user.permissionVersion = token.permissionVersion;
      }
      return session;
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // A completed sign-out may return to the allowlisted sign-in page.
      return safeReturnUrl(url, baseUrl, '/hub', true);
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    // 8 hour absolute cap; the JWT is re-issued on activity within that window.
    maxAge: 8 * 60 * 60,
    updateAge: 15 * 60,
  },
  jwt: {
    maxAge: 8 * 60 * 60,
  },
  cookies: {
    ...sharedSessionCookie(),
    state: {
      name: 'next-auth.state',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
