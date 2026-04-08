import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge about our custom text sizes so they don't conflict
// with text color utilities like `text-ink` or `text-[#111318]`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-lg",
            "display-md",
            "title-md",
            "body-lg",
            "body-lg-strong",
            "body-md",
            "body-md-strong",
            "body-sm",
            "body-sm-strong",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
