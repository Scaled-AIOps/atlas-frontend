import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AtlasApi } from '../../../core/api/atlas-api';
import { AppInfo, AppStatus, ENVIRONMENTS, Environment } from '../../../core/api/models';

const ENV_PLATFORM_FIELDS: Record<Environment, keyof AppInfo> = {
  local: 'localPlatform',
  dev: 'devPlatform',
  int: 'intPlatform',
  uat: 'uatPlatform',
  prd: 'prdPlatform',
};
const ENV_URL_FIELDS: Record<Environment, keyof AppInfo> = {
  local: 'localUrl',
  dev: 'devUrl',
  int: 'intUrl',
  uat: 'uatUrl',
  prd: 'prdUrl',
};

@Component({
  selector: 'app-appinfo-detail',
  imports: [RouterLink, TranslateModule],
  templateUrl: './appinfo-detail.html',
  styleUrl: './appinfo-detail.scss',
})
export class AppinfoDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(AtlasApi);
  readonly envs = ENVIRONMENTS;

  loading = signal(true);
  error = signal<string | null>(null);
  app = signal<AppInfo | null>(null);

  ngOnInit() {
    const appId = this.route.snapshot.paramMap.get('appId')!;
    this.api.getAppInfo(appId).subscribe({
      next: (a) => { this.app.set(a); this.loading.set(false); },
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

  envPlatform(a: AppInfo, env: Environment): string | undefined {
    return a[ENV_PLATFORM_FIELDS[env]] as string | undefined;
  }
  envUrl(a: AppInfo, env: Environment): string | undefined {
    return a[ENV_URL_FIELDS[env]] as string | undefined;
  }
}
