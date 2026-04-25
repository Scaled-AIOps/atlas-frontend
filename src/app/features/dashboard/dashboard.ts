import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AtlasApi } from '../../core/api/atlas-api';
import { AuthService } from '../../core/auth/auth.service';
import {
  AppInfo,
  AppStatus,
  AppStatusRecord,
  Squad,
} from '../../core/api/models';

interface RoleFieldDef {
  key: keyof Squad;
  label: string;
  /** Sort order in the role badges. */
  weight: number;
}

const ROLE_FIELDS: RoleFieldDef[] = [
  { key: 'po',           label: 'PO',           weight: 0 },
  { key: 'sm',           label: 'SM',           weight: 1 },
  { key: 'ao',           label: 'AO',           weight: 2 },
  { key: 'devops',       label: 'DevOps',       weight: 3 },
  { key: 'sre',          label: 'SRE',          weight: 4 },
  { key: 'backendDevs',  label: 'Backend',      weight: 5 },
  { key: 'frontendDevs', label: 'Frontend',     weight: 6 },
  { key: 'qa',           label: 'QA',           weight: 7 },
  { key: 'members',      label: 'Member',       weight: 8 },
];

interface MySquad {
  squad: Squad;
  roles: string[]; // role labels held in this squad
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, FormsModule, TranslateModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private api = inject(AtlasApi);
  private auth = inject(AuthService);

  loading = signal(true);
  error = signal<string | null>(null);

  // Catalog
  squads = signal<Squad[]>([]);
  infra = signal<number>(0);
  apps = signal<AppInfo[]>([]);
  statuses = signal<AppStatusRecord[]>([]);

  // Current user — sourced from the auth session.
  readonly email = this.auth.email;

  // Distinct emails extracted from every role field across every squad — feeds the <datalist>.
  emailOptions = computed<string[]>(() => {
    const set = new Set<string>();
    for (const s of this.squads()) {
      for (const f of ROLE_FIELDS) {
        const v = s[f.key];
        if (typeof v === 'string' && v) set.add(v);
        else if (Array.isArray(v)) for (const x of v) if (typeof x === 'string' && x) set.add(x);
      }
    }
    return Array.from(set).sort();
  });

  // Squads the current email belongs to + the roles held in each.
  mySquads = computed<MySquad[]>(() => {
    const e = this.email().trim().toLowerCase();
    if (!e) return [];
    const out: MySquad[] = [];
    for (const s of this.squads()) {
      const roles: { label: string; weight: number }[] = [];
      for (const f of ROLE_FIELDS) {
        const v = s[f.key];
        const matches =
          (typeof v === 'string' && v.toLowerCase() === e) ||
          (Array.isArray(v) && v.some((x) => typeof x === 'string' && x.toLowerCase() === e));
        if (matches) roles.push({ label: f.label, weight: f.weight });
      }
      if (roles.length > 0) {
        roles.sort((a, b) => a.weight - b.weight);
        out.push({ squad: s, roles: roles.map((r) => r.label) });
      }
    }
    return out;
  });

  // Apps owned by any of "my" squads.
  myApps = computed<AppInfo[]>(() => {
    const keys = new Set(this.mySquads().map((m) => m.squad.key));
    if (keys.size === 0) return [];
    return this.apps().filter((a) => a.squad && keys.has(a.squad));
  });

  myAppsByStatus = computed(() => {
    const buckets: Record<string, AppInfo[]> = { active: [], failed: [], 'marked-for-decommissioning': [], inactive: [] };
    for (const a of this.myApps()) {
      const s = (a.status as string) || 'active';
      (buckets[s] ??= []).push(a);
    }
    return buckets;
  });

  // Recent prd deploys for "my" apps — last 5, newest first.
  myRecentDeploys = computed(() => {
    const myAppIds = new Set(this.myApps().map((a) => a.appId));
    const out: { appId: string; state: string; version?: string; deployedAt: string }[] = [];
    for (const r of this.statuses()) {
      if (!myAppIds.has(r.appId)) continue;
      for (const env of ['prd', 'uat', 'int', 'dev', 'local'] as const) {
        const list = r[env] || [];
        for (const d of list) {
          out.push({ appId: r.appId, state: d.state, version: d.version, deployedAt: d.deployedAt });
        }
      }
    }
    out.sort((a, b) => new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime());
    return out.slice(0, 5);
  });

  // Failed apps across the whole catalog (always-useful operational view).
  globalFailedApps = computed(() => this.apps().filter((a) => a.status === 'failed'));

  // ── Lifecycle ──────────────────────────────────────────────────────
  ngOnInit() {
    forkJoin({
      squads: this.api.listSquads().pipe(catchError(() => of([] as Squad[]))),
      infra: this.api.listInfra().pipe(catchError(() => of([]))),
      apps: this.api.listAppInfo().pipe(catchError(() => of([] as AppInfo[]))),
      statuses: this.api.listAppStatus().pipe(catchError(() => of([] as AppStatusRecord[]))),
    }).subscribe({
      next: (r) => {
        this.squads.set(r.squads);
        this.infra.set(r.infra.length);
        this.apps.set(r.apps);
        this.statuses.set(r.statuses);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.message ?? 'Failed to load');
        this.loading.set(false);
      },
    });
  }

  badgeClass(status?: string): string {
    switch (status) {
      case 'active': return 'badge badge-success';
      case 'failed': return 'badge badge-danger';
      case 'inactive': return 'badge badge-muted';
      case 'marked-for-decommissioning': return 'badge badge-warn';
      default: return 'badge badge-muted';
    }
  }

  stateClass(s: string): string {
    switch (s) {
      case 'success': return 'badge badge-success';
      case 'failed':
      case 'rolledback': return 'badge badge-danger';
      case 'pending': return 'badge badge-warn';
      default: return 'badge badge-muted';
    }
  }
}
