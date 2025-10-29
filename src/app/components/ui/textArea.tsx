"use client";

import * as React from "react"
import { cn } from "@/lib/utils" // Assuming you have a `cn` utility for classnames

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }

// import { TextareaHTMLAttributes, forwardRef } from "react";
// import clsx from "clsx";

// interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

// const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
//   ({ className, ...props }, ref) => {
//     return (
//       <textarea
//         ref={ref}
//         className={clsx(
//           "w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow",
//           className
//         )}
//         {...props}
//       />
//     );
//   }
// );

// Textarea.displayName = "Textarea";
// export { Textarea };
