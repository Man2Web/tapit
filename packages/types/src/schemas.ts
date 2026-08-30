import { z } from "zod";

// Mirrors the `username_format` check constraint on public.profiles —
// keep in sync with supabase/migrations/20260830030340_phase0_schema.sql.
export const usernameSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9_-]+$/, "lowercase letters, numbers, underscore, hyphen only");

export const profileSchema = z.object({
  username: usernameSchema,
  display_name: z.string().min(1).max(120),
  designation: z.string().max(120).nullable().optional(),
  company: z.string().max(120).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  cover_url: z.string().url().nullable().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
