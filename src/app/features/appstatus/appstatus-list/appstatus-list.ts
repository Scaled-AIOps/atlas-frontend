import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AtlasApi } from '../../../core/api/atlas-api';
import { AppStatusRecord, ENVIRONMENTS, Environment } from '../../../core/api/models';
import { ListState } from '../../../shared/list-state';
import { ListControls } from '../../../shared/list-controls/list-controls';
import { Pagination } from '../../../shared/pagination/pagination';

@Component({
  selector: 'app-appstatus-list',
  imports: [RouterLink, ListControls, Pagination, TranslateModule],
  templateUrl: './appstatus-list.html',
  styleUrl: './appstatus-list.scss',
})
export class AppstatusList implements OnInit {
  private api = inject(AtlasApi);
  private route = inject(ActivatedRoute);
  readonly envs = ENVIRONMENTS;

  loading = signal(true);
  error = signal<string | null>(null);
  state = new ListState<AppStatusRecord>();

  constructor() {
    this.state.searchFields = [(r) => r.appId];
    this.state.filterFields = [
      { key: 'prdState', label: 'deploys.col.prd_state', pick: (r) => this.latest(r, 'prd')?.state },
      { key: 'uatState', label: 'deploys.col.uat_state', pick: (r) => this.latest(r, 'uat')?.state },
    ];
    this.state.sortFields = [
      { key: 'appId', label: 'deploys.col.app_id',         pick: (r) => r.appId },
      { key: 'prdAt', label: 'deploys.col.last_prd_deploy', pick: (r) => this.latest(r, 'prd')?.deployedAt },
    ];
    this.state.setSort('appId', 'asc');
  }

  ngOnInit() {
    this.state.applyFilterParams(this.route.snapshot.queryParamMap);
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
