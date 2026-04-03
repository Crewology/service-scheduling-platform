import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { COOKIE_NAME } from "@shared/const";

export const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),
  
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
  
  updateProfile: protectedProcedure
    .input(z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      profilePhotoUrl: z.string().optional(),
      email: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.updateUserProfile(ctx.user.id, input);
      const updated = await db.getUserById(ctx.user.id);
      return updated!;
    }),
});
