import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ListState } from '../list-state';
import { downloadAs, ExportFormat, makeFilename, serializeFor } from '../export';

@Component({
  selector: 'app-list-controls',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './list-controls.html',
  styleUrl: './list-controls.scss',
})
export class ListControls<T> {
  @Input({ required: true }) state!: ListState<T>;
  @Input() searchPlaceholder = 'Search…';
  /** Filename prefix used for exported files, e.g. "squads". */
  @Input() exportName = 'export';

  /** Which filter dropdown is open (key) — only one at a time. */
  openFilter = signal<string | null>(null);
  /** Whether the Export menu is open. */
  exportOpen = signal(false);

  toggleFilterDropdown(key: string) {
    this.exportOpen.set(false);
    this.openFilter.update((cur) => (cur === key ? null : key));
  }
  toggleExport() {
    this.openFilter.set(null);
    this.exportOpen.update((v) => !v);
  }
  closeDropdowns() {
    this.openFilter.set(null);
    this.exportOpen.set(false);
  }

  doExport(format: ExportFormat) {
    const rows = this.state.sorted() as any[];
    const { text, mime, ext } = serializeFor(format, rows);
    downloadAs(makeFilename(this.exportName, ext), mime, text);
    this.exportOpen.set(false);
  }

  onSortChange(value: string) {
    if (!value) {
      this.state.sort.set(null);
      return;
    }
    const dir: 'asc' | 'desc' = value.startsWith('-') ? 'desc' : 'asc';
    const key = value.startsWith('-') ? value.slice(1) : value;
    this.state.setSort(key, dir);
  }

  sortValue(): string {
    const s = this.state.sort();
    if (!s) return '';
    return (s.dir === 'desc' ? '-' : '') + s.key;
  }

  /** Flatten active filters into chips for the chip strip. */
  activeChips(): { key: string; label: string; value: string }[] {
    const out: { key: string; label: string; value: string }[] = [];
    const filters = this.state.filters();
    for (const [key, values] of filters) {
      const ff = this.state.filterFields.find((f) => f.key === key);
      if (!ff) continue;
      for (const v of values) {
        out.push({ key, label: ff.label, value: v });
      }
    }
    return out;
  }
}
