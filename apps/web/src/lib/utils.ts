import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Our own text sizes (styles/app.css: --text-label), so tailwind-merge treats them as sizes, not colours
const twMerge = extendTailwindMerge({ extend: { theme: { text: ['label'] } } });

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
