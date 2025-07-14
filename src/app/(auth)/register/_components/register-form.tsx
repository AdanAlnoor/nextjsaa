"use client";

import { Button } from "@/shared/components/ui/button";
import { Form } from "@/shared/components/ui/form";
import { InputForm } from "@/shared/components/ui/input/input-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { useState, useEffect } from "react";

export const registerFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
});

type RegisterValuesType = z.infer<typeof registerFormSchema>;

const defaultValues: RegisterValuesType = {
  email: "",
  password: "",
};

const RegisterForm = () => {
  const router = useRouter();
  const [supabase, setSupabase] = useState<any>(null);

  useEffect(() => {
    const initSupabase = async () => {
      const { createClient } = await import('@/shared/lib/supabase/client');
      setSupabase(createClient());
    };
    initSupabase();
  }, []);

  const form = useForm<RegisterValuesType>({
    resolver: zodResolver(registerFormSchema),
    defaultValues,
  });

  async function handleRegister(values: RegisterValuesType) {
    if (!supabase) {
      toast.error("Authentication system not ready. Please try again.");
      return;
    }

    const { error, data } = await supabase.auth.signUp({
      ...values,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
      },
    });

    if (error) return toast.error(error.message);

    console.log({ data });

    toast.success("Verification email sent. Check your mail.");

    router.replace("/email-verify");
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleRegister)}
        className="w-full flex flex-col gap-y-4"
      >
        <InputForm
          label="Email"
          name="email"
          placeholder="hello@sarathadhi.com"
          description=""
          required
        />

        <InputForm
          type="password"
          label="Password"
          name="password"
          description=""
          required
        />

        <Button>Register</Button>
      </form>
    </Form>
  );
};

export default RegisterForm;
