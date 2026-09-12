import { filterRelevant, isSearchQuery, traceMatch, type SearchableListing } from "./simple-search.ts";

export const HOME_SEARCH_VERSION = "simple-search-v3";

export type HomeSearchInput = {
  q?: string | null;
  categoryId?: number;
  /** True only when the user tapped a category control. Typing must never set this. */
  explicitCategory?: boolean;
};

export function resolveExplicitCategoryId(input: HomeSearchInput): number | undefined {
  if (input.explicitCategory === true && input.categoryId != null && Number.isFinite(input.categoryId)) {
    return input.categoryId;
  }
  return undefined;
}

/**
 * Server eligibility for Home simple search.
 * q nonempty → textRelevant only.
 * explicit category + q → AND, never OR, never inferred from q.
 */
export function applyHomeSearchEligibility<T extends SearchableListing & { categoryId?: number }>(
  rows: T[],
  input: HomeSearchInput,
): T[] {
  const categoryId = resolveExplicitCategoryId(input);
  let next = rows;
  if (categoryId != null) next = next.filter((row) => row.categoryId === categoryId);
  if (isSearchQuery(input.q)) next = filterRelevant(next, input.q ?? "");
  return next;
}

export function traceHomeSearch<T extends SearchableListing & { id?: string; categoryId?: number }>(
  rows: T[],
  input: HomeSearchInput,
) {
  const categoryId = resolveExplicitCategoryId(input);
  const kept = applyHomeSearchEligibility(rows, input);
  return {
    version: HOME_SEARCH_VERSION,
    q: input.q ?? "",
    explicitCategory: input.explicitCategory === true,
    categoryIdApplied: categoryId ?? null,
    terms: isSearchQuery(input.q) ? traceMatch(rows[0] ?? { name: "" }, input.q ?? "").terms : [],
    keptIds: kept.map((row) => row.id ?? row.name),
    traces: rows.map((row) => {
      const tr = isSearchQuery(input.q)
        ? traceMatch(row, input.q ?? "")
        : {
            score: 0,
            terms: [],
            name: false,
            jobTitle: false,
            service: false,
            category: false,
            description: false,
            kept: true,
          };
      const categoryOk = categoryId == null || row.categoryId === categoryId;
      return {
        id: row.id ?? row.name,
        name: row.name,
        jobTitle: row.jobTitle ?? null,
        services: (row.prices ?? []).map((p) => p.title),
        categoryId: row.categoryId ?? null,
        name_match: tr.name,
        job_match: tr.jobTitle,
        service_match: tr.service,
        synonym_used: tr.terms,
        category_membership: Boolean(row.categoryId),
        category_filter_ok: categoryOk,
        server_kept: Boolean(categoryOk && (isSearchQuery(input.q) ? tr.kept : true)),
      };
    }),
  };
}
