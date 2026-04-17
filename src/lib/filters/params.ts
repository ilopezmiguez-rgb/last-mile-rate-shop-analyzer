"use client";

import {
  parseAsArrayOf,
  parseAsFloat,
  parseAsString,
  useQueryStates,
} from "nuqs";

/**
 * Filter state — single source of truth for every view.
 *
 * Stored as URL search params via nuqs so every view is shareable.
 */
export interface Filter {
  origins: string[];
  metros: string[];
  zones: string[];
  weights: number[];
}

export const EMPTY_FILTER: Filter = {
  origins: [],
  metros: [],
  zones: [],
  weights: [],
};

const filterParsers = {
  origins: parseAsArrayOf(parseAsString, ",").withDefault([]),
  metros: parseAsArrayOf(parseAsString, ",").withDefault([]),
  zones: parseAsArrayOf(parseAsString, ",").withDefault([]),
  weights: parseAsArrayOf(parseAsFloat, ",").withDefault([]),
} as const;

export function useFilter() {
  const [state, set] = useQueryStates(filterParsers, {
    history: "replace",
    shallow: true,
    throttleMs: 150,
  });

  return {
    filter: state as Filter,
    setFilter: set,
    clear: () => set({ origins: [], metros: [], zones: [], weights: [] }),
    activeCount:
      state.origins.length +
      state.metros.length +
      state.zones.length +
      state.weights.length,
  };
}
