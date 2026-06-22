import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import * as db from "./db";
import { EmailProvider } from "./notifications/providers/email";

const router = Router();

// ============================================================================
// EMAIL/PASSWORD REGISTRATION
// ============================================================================

router.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Validate password strength (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = await db.createUserWithEmail({
      email: email.toLowerCase(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    if (!user) {
      return res.status(500).json({ error: "Failed to create account" });
    }

    // Send verification email
    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, "") || "";
    const verifyUrl = `${origin}/verify-email?token=${verificationToken}`;
    
    await EmailProvider.sendRaw(
      email.toLowerCase(),
      "Verify your OlogyCrew account",
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a;">Welcome to OlogyCrew!</h2>
          <p>Hi ${firstName},</p>
          <p>Thanks for signing up. Please verify your email address to get started.</p>
          <a href="${verifyUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Verify Email</a>
          <p style="color: #666; font-size: 14px;">Or copy this link: ${verifyUrl}</p>
          <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">If you didn't create this account, you can safely ignore this email.</p>
        </div>
      `,
      `Welcome to OlogyCrew! Verify your email: ${verifyUrl}`
    );

    // Create session and set cookie (user can use the app while unverified, but with limited access)
    const sessionToken = await sdk.createSessionToken(user.openId, {
      name: user.name || "",
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        hasSelectedRole: user.hasSelectedRole,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[Auth] Registration failed:", error);
    return res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// ============================================================================
// EMAIL/PASSWORD LOGIN
// ============================================================================

router.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await db.getUserByEmail(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check if user has a password (might be Google-only account)
    if (!user.passwordHash) {
      return res.status(401).json({ 
        error: "This account uses Google sign-in. Please sign in with Google.",
        useGoogle: true 
      });
    }

    // Check if account is suspended
    if (user.deletedAt) {
      return res.status(403).json({ error: "This account has been suspended" });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Update last sign in
    await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });

    // Create session
    const sessionToken = await sdk.createSessionToken(user.openId, {
      name: user.name || "",
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        hasSelectedRole: user.hasSelectedRole,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[Auth] Login failed:", error);
    return res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// ============================================================================
// GOOGLE OAUTH
// ============================================================================

router.get("/api/auth/google", (req: Request, res: Response) => {
  const origin = req.query.origin as string || req.headers.origin || "";
  const redirectUri = `${origin}/api/auth/google/callback`;
  
  const params = new URLSearchParams({
    client_id: ENV.googleClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state: Buffer.from(JSON.stringify({ origin })).toString("base64"),
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get("/api/auth/google/callback", async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const stateParam = req.query.state as string;

    if (!code) {
      return res.redirect("/login?error=no_code");
    }

    // Decode state to get origin
    let origin = "";
    try {
      const stateData = JSON.parse(Buffer.from(stateParam || "", "base64").toString());
      origin = stateData.origin || "";
    } catch {
      origin = `${req.protocol}://${req.get("host")}`;
    }

    const redirectUri = `${origin}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: ENV.googleClientId,
        client_secret: ENV.googleClientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("[Google Auth] Token exchange failed:", await tokenResponse.text());
      return res.redirect("/login?error=token_exchange_failed");
    }

    const tokens = await tokenResponse.json() as { access_token: string; id_token: string };

    // Get user info from Google
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      return res.redirect("/login?error=user_info_failed");
    }

    const googleUser = await userInfoResponse.json() as {
      id: string;
      email: string;
      name: string;
      given_name: string;
      family_name: string;
      picture: string;
      verified_email: boolean;
    };

    // Check if user exists by Google ID
    let user = await db.getUserByGoogleId(googleUser.id);

    if (!user) {
      // Check if user exists by email (might have registered with email/password)
      const existingUser = await db.getUserByEmail(googleUser.email.toLowerCase());
      
      if (existingUser) {
        // Link Google account to existing user
        await db.linkGoogleAccount(existingUser.id, googleUser.id);
        user = existingUser;
      } else {
        // Create new user with Google
        user = await db.createUserWithGoogle({
          googleId: googleUser.id,
          email: googleUser.email.toLowerCase(),
          name: googleUser.name,
          firstName: googleUser.given_name || "",
          lastName: googleUser.family_name || "",
          profilePhotoUrl: googleUser.picture,
        });
      }
    }

    if (!user) {
      return res.redirect("/login?error=account_creation_failed");
    }

    // Update last sign in
    await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });

    // Create session
    const sessionToken = await sdk.createSessionToken(user.openId, {
      name: user.name || "",
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

    // Smart redirect based on user state
    let redirectPath = "/";
    if (!user.hasSelectedRole) {
      redirectPath = "/select-role";
    } else if (user.role === "provider") {
      redirectPath = "/provider/dashboard";
    } else if (user.role === "customer") {
      redirectPath = "/browse";
    } else if (user.role === "admin") {
      redirectPath = "/admin";
    }

    return res.redirect(302, redirectPath);
  } catch (error) {
    console.error("[Google Auth] Callback failed:", error);
    return res.redirect("/login?error=callback_failed");
  }
});

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================

router.post("/api/auth/verify-email", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Verification token is required" });
    }

    const result = await db.verifyUserEmail(token);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    console.error("[Auth] Email verification failed:", error);
    return res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

router.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await db.getUserByEmail(email.toLowerCase());
    if (!user) {
      // Don't reveal if user exists
      return res.json({ success: true, message: "If an account exists, a verification email has been sent." });
    }

    if (user.emailVerified) {
      return res.json({ success: true, message: "Email is already verified." });
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.setEmailVerificationToken(user.id, verificationToken, verificationExpires);

    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, "") || "";
    const verifyUrl = `${origin}/verify-email?token=${verificationToken}`;

    await EmailProvider.sendRaw(
      email.toLowerCase(),
      "Verify your OlogyCrew account",
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a;">Verify Your Email</h2>
          <p>Hi ${user.firstName || "there"},</p>
          <p>Click the button below to verify your email address.</p>
          <a href="${verifyUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Verify Email</a>
          <p style="color: #666; font-size: 14px;">Or copy this link: ${verifyUrl}</p>
          <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
        </div>
      `,
      `Verify your OlogyCrew email: ${verifyUrl}`
    );

    return res.json({ success: true, message: "Verification email sent." });
  } catch (error) {
    console.error("[Auth] Resend verification failed:", error);
    return res.status(500).json({ error: "Failed to send verification email." });
  }
});

// ============================================================================
// FORGOT PASSWORD / RESET PASSWORD
// ============================================================================

router.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await db.getUserByEmail(email.toLowerCase());
    
    // Always return success to prevent email enumeration
    if (!user || !user.passwordHash) {
      return res.json({ success: true, message: "If an account exists with this email, a reset link has been sent." });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.setPasswordResetToken(user.id, resetToken, resetExpires);

    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, "") || "";
    const resetUrl = `${origin}/reset-password?token=${resetToken}`;

    await EmailProvider.sendRaw(
      email.toLowerCase(),
      "Reset your OlogyCrew password",
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a;">Reset Your Password</h2>
          <p>Hi ${user.firstName || "there"},</p>
          <p>We received a request to reset your password. Click the button below to create a new password.</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reset Password</a>
          <p style="color: #666; font-size: 14px;">Or copy this link: ${resetUrl}</p>
          <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">If you didn't request this, you can safely ignore this email. Your password won't be changed.</p>
        </div>
      `,
      `Reset your OlogyCrew password: ${resetUrl}`
    );

    return res.json({ success: true, message: "If an account exists with this email, a reset link has been sent." });
  } catch (error) {
    console.error("[Auth] Forgot password failed:", error);
    return res.status(500).json({ error: "Failed to process request. Please try again." });
  }
});

router.post("/api/auth/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.resetPassword(token, passwordHash);

    if (!result.success) {
      return res.status(400).json({ error: result.error === "Token expired" ? "Reset link has expired. Please request a new one." : "Invalid reset link." });
    }

    return res.json({ success: true, message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.error("[Auth] Reset password failed:", error);
    return res.status(500).json({ error: "Failed to reset password. Please try again." });
  }
});

// ============================================================================
// LOGOUT (GET endpoint - browser navigates here directly, guaranteeing cookie is cleared before redirect)
// ============================================================================

router.get("/api/auth/logout", (req: Request, res: Response) => {
  // Clear the cookie with ALL possible attribute combinations to handle proxy inconsistencies.
  // The cookie might have been set with Secure=true (login over HTTPS proxy) but the logout
  // request might not have X-Forwarded-Proto, causing isSecureRequest to return false.
  // Browsers only clear cookies when attributes match exactly, so we clear with all variants.
  const baseCookieOpts = { httpOnly: true, path: "/" };
  const variants = [
    { ...baseCookieOpts, sameSite: "none" as const, secure: true },
    { ...baseCookieOpts, sameSite: "none" as const, secure: false },
    { ...baseCookieOpts, sameSite: "lax" as const, secure: true },
    { ...baseCookieOpts, sameSite: "lax" as const, secure: false },
    { ...baseCookieOpts, sameSite: "strict" as const, secure: true },
    { ...baseCookieOpts, sameSite: "strict" as const, secure: false },
  ];
  for (const opts of variants) {
    res.clearCookie(COOKIE_NAME, opts);
    res.cookie(COOKIE_NAME, "", { ...opts, maxAge: 0, expires: new Date(0) });
  }
  console.log("[Auth] Logout: cookie cleared via GET /api/auth/logout (all variants)");
  // Also set Cache-Control to prevent any intermediate caching
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  const returnTo = (req.query.returnTo as string) || "/";
  // Only allow relative paths to prevent open redirect
  const safePath = returnTo.startsWith("/") ? returnTo : "/";
  res.redirect(302, `${safePath}?logged_out=1`);
});

router.post("/api/auth/logout", (req: Request, res: Response) => {
  // Same comprehensive clearing as the GET endpoint
  const baseCookieOpts = { httpOnly: true, path: "/" };
  const variants = [
    { ...baseCookieOpts, sameSite: "none" as const, secure: true },
    { ...baseCookieOpts, sameSite: "none" as const, secure: false },
    { ...baseCookieOpts, sameSite: "lax" as const, secure: true },
    { ...baseCookieOpts, sameSite: "lax" as const, secure: false },
    { ...baseCookieOpts, sameSite: "strict" as const, secure: true },
    { ...baseCookieOpts, sameSite: "strict" as const, secure: false },
  ];
  for (const opts of variants) {
    res.clearCookie(COOKIE_NAME, opts);
    res.cookie(COOKIE_NAME, "", { ...opts, maxAge: 0, expires: new Date(0) });
  }
  console.log("[Auth] Logout: cookie cleared via POST /api/auth/logout (all variants)");
  res.json({ success: true });
});

export default router;
