import { z } from "zod";
import { ApiError } from "@/lib/api/client";

const summarySchema = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,159}$/),
  name: z.string(),
  category: z.string(),
  government_level: z.enum(["central", "state"]),
  summary: z.string(),
  verification_status: z.literal("unverified"),
});
const listingSchema = z.object({
  items: z.array(summarySchema),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  categories: z.array(z.string()),
  notice: z.string(),
});
const detailSchema = summarySchema.extend({
  benefits: z.string(),
  eligibility: z.string(),
  application: z.string(),
  documents: z.string(),
  official_url: z.null(),
  dataset_url: z.string(),
  notice: z.string(),
});
const answerSchema = z.object({
  mode: z.literal("extractive"),
  answer: z.string(),
  notice: z.string(),
  sources: z.array(
    z.object({
      slug: summarySchema.shape.slug,
      name: z.string(),
      excerpt: z.string(),
      verification_status: z.literal("unverified"),
    }),
  ),
});
export type CatalogueRecord = z.infer<typeof detailSchema>;

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  body?: object,
): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (!base)
    throw new ApiError(
      "CONFIGURATION",
      "The scheme service is not configured.",
    );
  try {
    const response = await fetch(`${base}/api/v1${path}`, {
      method: body ? "POST" : "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok)
      throw new ApiError(
        "HTTP_ERROR",
        "The request could not be completed.",
        response.status,
      );
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success)
      throw new ApiError(
        "INVALID_RESPONSE",
        "The scheme response was incomplete.",
      );
    return parsed.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "NETWORK_ERROR",
      "The scheme service is unavailable. Please try again.",
    );
  }
}
export const catalogueApi = {
  list: (query: string) =>
    request(`/catalogue${query ? `?${query}` : ""}`, listingSchema),
  detail: (slug: string) =>
    request(`/catalogue/${encodeURIComponent(slug)}`, detailSchema),
  ask: (question: string) => request("/assistant", answerSchema, { question }),
};
