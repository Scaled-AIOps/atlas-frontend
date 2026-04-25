import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AtlasApi } from '../../../core/api/atlas-api';
import { Tribe } from '../../../core/api/models';
import { ListState } from '../../../shared/list-state';
import { ListControls } from '../../../shared/list-controls/list-controls';
import { Pagination } from '../../../shared/pagination/pagination';

@Component({
  selector: 'app-tribe-list',
  imports: [RouterLink, ListControls, Pagination, TranslateModule],
  templateUrl: './tribe-list.html',
  styleUrl: './tribe-list.scss',
})
export class TribeList implements OnInit {
  private api = inject(AtlasApi);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  error = signal<string | null>(null);
  state = new ListState<Tribe>();

  constructor() {
    this.state.searchFields = [
      (t) => t.name,
      (t) => t.lead,
      (t) => t.releaseManager,
      (t) => t.description,
    ];
    this.state.filterFields = [
      { key: 'tribeDomain',    label: 'tribes.col.tribe_domain',    pick: (t) => t.tribeDomain },
      { key: 'subDomain',      label: 'tribes.col.sub_domain',      pick: (t) => t.subDomain },
      { key: 'releaseManager', label: 'tribes.col.release_manager', pick: (t) => t.releaseManager },
    ];
    this.state.sortFields = [
      { key: 'name',           label: 'tribes.col.name',            pick: (t) => t.name },
      { key: 'tribeDomain',    label: 'tribes.col.tribe_domain',    pick: (t) => t.tribeDomain },
      { key: 'subDomain',      label: 'tribes.col.sub_domain',      pick: (t) => t.subDomain },
      { key: 'releaseManager', label: 'tribes.col.release_manager', pick: (t) => t.releaseManager },
    ];
    this.state.setSort('name', 'asc');
  }

  ngOnInit() {
    this.state.applyFilterParams(this.route.snapshot.queryParamMap);
    this.api.listTribes().subscribe({
      next: (t) => { this.state.setSource(t); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed to load'); this.loading.set(false); },
    });
  }
}
