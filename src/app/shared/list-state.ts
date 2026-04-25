import { Signal, computed, signal } from '@angular/core';

export interface FilterField<T> {
  /** Key shown in the chip and used in the active-filters Map. */
  key: string;
  /** Label shown in the dropdown header. */
  label: string;
  /** Extracts the candidate value from an item. Returns undefined to opt out. */
  pick: (item: T) => string | undefined;
}

export interface SortField<T> {
  key: string;
  label: string;
  /** Extracts the comparable value (string or number). */
  pick: (item: T) => string | number | undefined;
}

export type ActiveFilters = Map<string, Set<string>>;

export interface ListQuery {
  search: string;
  sort: { key: string; dir: 'asc' | 'desc' } | null;
  filters: ActiveFilters;
  limit: number;
  offset: number;
}

const PAGE_SIZES = [10, 25, 50, 100];

export class ListState<T> {
  // ── Inputs ────────────────────────────────────────────────────────
  readonly source = signal<T[]>([]);
  readonly search = signal('');
  readonly sort = signal<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  /** key -> set of selected values (OR within field, AND across fields). */
  readonly filters = signal<ActiveFilters>(new Map());
  readonly limit = signal(25);
  readonly offset = signal(0);

  // ── Configuration (set once by the page) ──────────────────────────
  searchFields: ((item: T) => string | undefined)[] = [];
  filterFields: FilterField<T>[] = [];
  sortFields: SortField<T>[] = [];

  // ── Derived values ────────────────────────────────────────────────
  /** Items after search + filter — used to count totals. */
  readonly filtered: Signal<T[]> = computed(() => {
    const q = this.search().trim().toLowerCase();
    const filters = this.filters();
    const items = this.source();

    return items.filter((it) => {
      // Search across all configured search fields.
      if (q) {
        const hit = this.searchFields.some((pick) => {
          const v = pick(it);
          return v != null && String(v).toLowerCase().includes(q);
        });
        if (!hit) return false;
      }
      // AND across filter fields, OR within each field's values.
      for (const [key, values] of filters) {
        if (values.size === 0) continue;
        const ff = this.filterFields.find((f) => f.key === key);
        if (!ff) continue;
        const v = ff.pick(it);
        if (v == null || !values.has(String(v))) return false;
      }
      return true;
    });
  });

  /** Filtered, then sorted. */
  readonly sorted: Signal<T[]> = computed(() => {
    const sort = this.sort();
    const arr = [...this.filtered()];
    if (!sort) return arr;
    const sf = this.sortFields.find((f) => f.key === sort.key);
    if (!sf) return arr;
    const dir = sort.dir === 'desc' ? -1 : 1;
    arr.sort((a, b) => {
      const av = sf.pick(a);
      const bv = sf.pick(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return arr;
  });

  /** Final page-sliced result the table renders. */
  readonly page: Signal<T[]> = computed(() => {
    const off = this.offset();
    const lim = this.limit();
    return this.sorted().slice(off, off + lim);
  });

  readonly total = computed(() => this.filtered().length);
  readonly pageStart = computed(() => (this.total() === 0 ? 0 : this.offset() + 1));
  readonly pageEnd = computed(() =>
    Math.min(this.offset() + this.limit(), this.total()),
  );
  readonly canPrev = computed(() => this.offset() > 0);
  readonly canNext = computed(() => this.offset() + this.limit() < this.total());
  readonly pageSizes = PAGE_SIZES;

  // ── Mutators ──────────────────────────────────────────────────────
  setSource(items: T[]) {
    this.source.set(items);
    this.offset.set(0);
  }
  setSearch(v: string) {
    this.search.set(v);
    this.offset.set(0);
  }
  setSort(key: string, dir: 'asc' | 'desc') {
    this.sort.set({ key, dir });
    this.offset.set(0);
  }
  toggleFilter(key: string, value: string) {
    const next = new Map(this.filters());
    const set = new Set(next.get(key) ?? []);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    if (set.size === 0) next.delete(key);
    else next.set(key, set);
    this.filters.set(next);
    this.offset.set(0);
  }
  removeFilter(key: string, value: string) {
    const next = new Map(this.filters());
    const set = new Set(next.get(key) ?? []);
    set.delete(value);
    if (set.size === 0) next.delete(key);
    else next.set(key, set);
    this.filters.set(next);
    this.offset.set(0);
  }
  clearFilters() {
    this.filters.set(new Map());
    this.offset.set(0);
  }
  setLimit(n: number) {
    this.limit.set(n);
    this.offset.set(0);
  }
  prevPage() {
    this.offset.set(Math.max(0, this.offset() - this.limit()));
  }
  nextPage() {
    if (this.canNext()) this.offset.set(this.offset() + this.limit());
  }

  // ── Helpers ───────────────────────────────────────────────────────
  /** Distinct values found in the source for a given filter field, sorted. */
  filterOptions(key: string): string[] {
    const ff = this.filterFields.find((f) => f.key === key);
    if (!ff) return [];
    const seen = new Set<string>();
    for (const it of this.source()) {
      const v = ff.pick(it);
      if (v != null) seen.add(String(v));
    }
    return Array.from(seen).sort();
  }

  isFilterActive(key: string, value: string): boolean {
    return this.filters().get(key)?.has(value) ?? false;
  }
}
