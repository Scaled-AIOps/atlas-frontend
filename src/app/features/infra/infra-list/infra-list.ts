import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AtlasApi } from '../../../core/api/atlas-api';
import { Infra } from '../../../core/api/models';
import { ListState } from '../../../shared/list-state';
import { ListControls } from '../../../shared/list-controls/list-controls';
import { Pagination } from '../../../shared/pagination/pagination';

@Component({
  selector: 'app-infra-list',
  imports: [RouterLink, ListControls, Pagination],
  templateUrl: './infra-list.html',
  styleUrl: './infra-list.scss',
})
export class InfraList implements OnInit {
  private api = inject(AtlasApi);

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
      { key: 'platform',     label: 'Platform',     pick: (i) => i.platform },
      { key: 'platformType', label: 'Type',         pick: (i) => i.platformType },
      { key: 'environment',  label: 'Environment',  pick: (i) => i.environment },
    ];
    this.state.sortFields = [
      { key: 'platformId',   label: 'Platform ID',  pick: (i) => i.platformId },
      { key: 'name',         label: 'Name',         pick: (i) => i.name },
      { key: 'environment',  label: 'Environment',  pick: (i) => i.environment },
      { key: 'platformType', label: 'Type',         pick: (i) => i.platformType },
    ];
    this.state.setSort('platformId', 'asc');
  }

  ngOnInit() {
    this.api.listInfra().subscribe({
      next: (i) => { this.state.setSource(i); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed to load'); this.loading.set(false); },
    });
  }
}
