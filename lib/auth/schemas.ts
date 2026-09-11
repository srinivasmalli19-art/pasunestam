import { z } from 'zod';

// Shared shape for the sign-in and sign-up forms. Kept in one place so the
// server actions and (later) any client-side error hints stay in sync.
export const signInSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email address.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export const signUpSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email address.').email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 letters or numbers.'),
  fullName: z.string().trim().min(1, 'Enter your full name.'),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
