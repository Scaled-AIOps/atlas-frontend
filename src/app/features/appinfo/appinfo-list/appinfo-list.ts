import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AtlasApi } from '../../../core/api/atlas-api';
import { AppInfo, AppStatus } from '../../../core/api/models';
import { ListState } from '../../../shared/list-state';
import { ListControls } from '../../../shared/list-controls/list-controls';
import { Pagination } from '../../../shared/pagination/pagination';

@Component({
  selector: 'app-appinfo-list',
  imports: [RouterLink, ListControls, Pagination, TranslateModule],
  templateUrl: './appinfo-list.html',
  styleUrl: './appinfo-list.scss',
})
export class AppinfoList implements OnInit {
  private api = inject(AtlasApi);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  error = signal<string | null>(null);
  state = new ListState<AppInfo>();

  constructor() {
    this.state.searchFields = [
      (a) => a.appId,
      (a) => a.squad,
      (a) => a.gitRepo,
    ];
    this.state.filterFields = [
      { key: 'squad',       label: 'apps.col.squad',        pick: (a) => a.squad },
      { key: 'status',      label: 'apps.col.status',       pick: (a) => a.status },
      { key: 'prdPlatform', label: 'apps.col.prd_platform', pick: (a) => a.prdPlatform },
    ];
    this.state.sortFields = [
      { key: 'appId',  label: 'apps.col.app_id', pick: (a) => a.appId },
      { key: 'squad',  label: 'apps.col.squad',  pick: (a) => a.squad },
      { key: 'status', label: 'apps.col.status', pick: (a) => a.status },
    ];
    this.state.setSort('appId', 'asc');
  }

  ngOnInit() {
    this.state.applyFilterParams(this.route.snapshot.queryParamMap);
    this.api.listAppInfo().subscribe({
      next: (a) => { this.state.setSource(a); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed to load'); this.loading.set(false); },
    });
  }

  badgeClass(status?: AppStatus): string {
    switch (status) {
      case 'active': return 'badge badge-success';
      case 'failed': return 'badge badge-danger';
      case 'inactive': return 'badge badge-muted';
      case 'marked-for-decommissioning': return 'badge badge-warn';
      default: return 'badge badge-muted';
    }
  }
}
