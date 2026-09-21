import { z } from "zod";

export const inviteAdminRequestSchema = z.object({
  email: z.string().trim().min(1, "Escribe un email.").max(200).email("Ese email no es válido."),
  displayName: z.string().trim().max(80).optional(),
});

export const inviteAdminSuccessSchema = z.object({
  userId: z.string(),
  email: z.string(),
  displayName: z.string().nullable(),
  invitedBy: z.string().nullable(),
  createdAt: z.string(),
});

export const inviteAdminErrorSchema = z.object({ error: z.string() });

export type InviteAdminRequest = z.infer<typeof inviteAdminRequestSchema>;
export type InviteAdminSuccess = z.infer<typeof inviteAdminSuccessSchema>;
