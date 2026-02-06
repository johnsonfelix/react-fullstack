
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/app/components/ui/form";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { FaSpinner, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import Link from "next/link";

const FormSchema = z.object({
    email: z.string().min(1, "Email is required").email("Invalid email address"),
});

export default function RecoverAccountPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: { email: "" },
    });

    const onSubmit = async (values: z.infer<typeof FormSchema>) => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await fetch("/api/auth/recover-account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Something went wrong");
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Recover Account</h1>
                    <p className="text-gray-500 text-sm mt-2">
                        Enter your email to receive login credentials or a reset link.
                    </p>
                </div>

                {success ? (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 text-3xl">
                            <FaCheckCircle />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Check your email</h3>
                        <p className="text-gray-600 mb-6">
                            We've sent instructions to <strong>{form.getValues("email")}</strong>.
                        </p>
                        <Link href="/sign-in">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                Back to Sign In
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email Address</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="name@company.com"
                                                className="p-3"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {error && (
                                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                                    <FaExclamationCircle /> {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-blue-600 hover:bg-blue-700 py-6"
                            >
                                {isSubmitting ? (
                                    <><FaSpinner className="animate-spin mr-2" /> Sending...</>
                                ) : (
                                    "Send Recovery Link"
                                )}
                            </Button>

                            <div className="text-center mt-4">
                                <Link href="/sign-in" className="text-sm text-gray-500 hover:text-gray-900">
                                    Back to Sign In
                                </Link>
                            </div>
                        </form>
                    </Form>
                )}
            </div>
        </div>
    );
}
