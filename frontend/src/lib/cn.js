import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// shadcn 관례: 조건부 클래스(clsx) + Tailwind 클래스 충돌 정리(tailwind-merge).
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
