import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AtlasApi } from '../../../core/api/atlas-api';
import { Infra } from '../../../core/api/models';
import { ListState } from '../../../shared/list-state';
import { ListControls } from '../../../shared/list-controls/list-controls';
import { Pagination } from '../../../shared/pagination/pagination';

@Component({
  selector: 'app-infra-list',
  imports: [RouterLink, ListControls, Pagination, TranslateModule],
  templateUrl: './infra-list.html',
  styleUrl: './infra-list.scss',
})
export class InfraList implements OnInit {
  private api = inject(AtlasApi);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  error = signal<string | null>(null);
  state = new ListState<Infra>();

  constructor() {
    this.state.searchFields = [
      (i) => i.platformId,
      (i) => i.name,
      (i) => i.host,
      (i) => i.clusterId,
    ];
    this.state.filterFields = [
      { key: 'platform',     label: 'infra.col.platform',    pick: (i) => i.platform },
      { key: 'platformType', label: 'infra.col.type',        pick: (i) => i.platformType },
      { key: 'environment',  label: 'infra.col.environment', pick: (i) => i.environment },
    ];
    this.state.sortFields = [
      { key: 'platformId',   label: 'infra.col.platform_id', pick: (i) => i.platformId },
      { key: 'name',         label: 'infra.col.name',        pick: (i) => i.name },
      { key: 'environment',  label: 'infra.col.environment', pick: (i) => i.environment },
      { key: 'platformType', label: 'infra.col.type',        pick: (i) => i.platformType },
    ];
    this.state.setSort('platformId', 'asc');
  }

  ngOnInit() {
    this.state.applyFilterParams(this.route.snapshot.queryParamMap);
    this.api.listInfra().subscribe({
      next: (i) => { this.state.setSource(i); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed to load'); this.loading.set(false); },
    });
  }
}
