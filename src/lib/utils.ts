import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  admin: 'bg-info/20 text-info',
  lead: 'bg-info/20 text-info',
  member: 'bg-success/20 text-success',
  owner: 'bg-warning/20 text-warning',
  viewer: 'bg-muted/20 text-muted',
}

export function getRoleBadgeColor(role: string): string {
  return ROLE_BADGE_COLORS[role] ?? 'bg-muted/20 text-muted'
}

export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null }
