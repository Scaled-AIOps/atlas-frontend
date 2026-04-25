import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AtlasApi } from '../../../core/api/atlas-api';
import { AppStatusRecord, ENVIRONMENTS, Environment } from '../../../core/api/models';
import { ListState } from '../../../shared/list-state';
import { ListControls } from '../../../shared/list-controls/list-controls';
import { Pagination } from '../../../shared/pagination/pagination';

@Component({
  selector: 'app-appstatus-list',
  imports: [RouterLink, ListControls, Pagination],
  templateUrl: './appstatus-list.html',
  styleUrl: './appstatus-list.scss',
})
export class AppstatusList implements OnInit {
  private api = inject(AtlasApi);
  readonly envs = ENVIRONMENTS;

  loading = signal(true);
  error = signal<string | null>(null);
  state = new ListState<AppStatusRecord>();

  constructor() {
    this.state.searchFields = [(r) => r.appId];
    this.state.filterFields = [
      { key: 'prdState', label: 'Prd state', pick: (r) => this.latest(r, 'prd')?.state },
      { key: 'uatState', label: 'Uat state', pick: (r) => this.latest(r, 'uat')?.state },
    ];
    this.state.sortFields = [
      { key: 'appId', label: 'App ID', pick: (r) => r.appId },
      { key: 'prdAt', label: 'Last prd deploy', pick: (r) => this.latest(r, 'prd')?.deployedAt },
    ];
    this.state.setSort('appId', 'asc');
  }

  ngOnInit() {
    this.api.listAppStatus().subscribe({
      next: (r) => { this.state.setSource(r); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed to load'); this.loading.set(false); },
    });
  }

  latest(record: AppStatusRecord, env: Environment) {
    const list = record[env] ?? [];
    return list.length > 0 ? list[list.length - 1] : null;
  }

  stateClass(state?: string): string {
    switch (state) {
      case 'success': return 'badge badge-success';
      case 'failed':
      case 'rolledback': return 'badge badge-danger';
      case 'pending': return 'badge badge-warn';
      default: return 'badge badge-muted';
    }
  }
}
