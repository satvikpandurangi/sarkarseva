"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";

const CHANGE = "sarkarseva-storage";
const bookmarkSchema = z
  .array(
    z.object({
      slug: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,159}$/),
      name: z.string().min(1).max(255),
    }),
  )
  .max(100);
export const BOOKMARKS = "sarkarseva:reference-bookmarks:v1";
export type Bookmark = z.infer<typeof bookmarkSchema>[number];

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE, callback);
  };
}
export function useStoredList<T>(key: string, schema: z.ZodType<T[]>) {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
  let value: T[] = [];
  try {
    const parsed = schema.safeParse(JSON.parse(raw ?? "[]"));
    if (parsed.success) value = parsed.data;
  } catch {
    /* Invalid browser data is ignored. */
  }
  function save(next: T[]): boolean {
    if (!schema.safeParse(next).success) return false;
    try {
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event(CHANGE));
      return true;
    } catch {
      return false;
    }
  }
  return { value, save };
}
export function useBookmarks() {
  return useStoredList(BOOKMARKS, bookmarkSchema);
}
export const checklistSchema = z.array(z.string().max(4000)).max(100);
export const customChecklistSchema = z
  .array(z.string().trim().min(1).max(240))
  .max(40);
