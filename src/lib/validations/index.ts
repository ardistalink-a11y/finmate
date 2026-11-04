import { z } from "zod";

export const emailSchema = z.string().email("Email tidak valid");
export const passwordSchema = z.string().min(8, "Password minimal 8 karakter");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password wajib diisi"),
});

export const registerSchema = z.object({
  full_name: z.string().min(2, "Nama minimal 2 karakter"),
  email: emailSchema,
  password: passwordSchema,
});

export const accountTypeSchema = z.enum([
  "bank",
  "ewallet",
  "cash",
  "credit_card",
  "investment",
  "loan",
]);

export const accountSchema = z.object({
  name: z.string().min(1, "Nama dompet wajib diisi").max(60),
  type: accountTypeSchema,
  currency: z.string().length(3),
  opening_balance: z.coerce.number().default(0),
  credit_limit: z.coerce.number().optional(),
});

export const transactionTypeSchema = z.enum(["income", "expense", "transfer"]);

export const transactionSchema = z.object({
  account_id: z.string().uuid(),
  category_id: z.string().uuid().nullable().optional(),
  type: transactionTypeSchema,
  amount: z.coerce.number().positive("Jumlah harus lebih dari 0"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(280).optional(),
  merchant: z.string().max(120).optional(),
  // For transfers
  to_account_id: z.string().uuid().optional(),
  to_amount: z.coerce.number().positive().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
