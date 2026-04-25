import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ListState } from '../list-state';

@Component({
  selector: 'app-pagination',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pg" [class.pg-empty]="state.total() === 0">
      <span class="pg-info">
        @if (state.total() === 0) {
          No results
        } @else {
          Showing <strong>{{ state.pageStart() }}</strong>–<strong>{{ state.pageEnd() }}</strong>
          of <strong>{{ state.total() }}</strong>
        }
      </span>
      <span class="pg-spacer"></span>
      <button class="pg-btn" [disabled]="!state.canPrev()" (click)="state.prevPage()">‹ Prev</button>
      <button class="pg-btn" [disabled]="!state.canNext()" (click)="state.nextPage()">Next ›</button>
    </div>
  `,
  styles: [`
    .pg {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.55rem 0.85rem;
      border-top: 1px solid var(--border);
      background: var(--surface-card);
      font-size: 0.82rem;
      color: var(--text);

      strong { color: var(--text-strong); font-weight: 600; }
    }
    .pg-info { color: var(--text-muted); }
    .pg-spacer { flex: 1; }
    .pg-btn {
      padding: 0.3rem 0.7rem;
      border: 1px solid var(--border);
      background: var(--surface-card);
      color: var(--blue-700);
      border-radius: 6px;
      font-size: 0.82rem;
      cursor: pointer;

      &:hover:not([disabled]) { background: var(--blue-50); border-color: var(--blue-300); }
      &[disabled] { opacity: 0.45; cursor: not-allowed; }
    }
    .pg-empty .pg-btn { display: none; }
  `],
})
export class Pagination<T> {
  @Input({ required: true }) state!: ListState<T>;
}
