"use client";

import { TextareaHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={clsx(
          "w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
export { Textarea };
