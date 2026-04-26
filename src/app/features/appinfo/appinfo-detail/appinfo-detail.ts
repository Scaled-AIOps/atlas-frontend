import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AtlasApi } from '../../../core/api/atlas-api';
import {
  AppInfo,
  AppStatus,
  ENVIRONMENTS,
  Environment,
  Squad,
  SubDomain,
  Tribe,
  TribeDomain,
} from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth.service';

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

const STATUS_OPTIONS: AppStatus[] = ['active', 'inactive', 'marked-for-decommissioning', 'failed'];

interface AppEditModel {
  status: AppStatus | '';
  gitRepo: string;
  // env platforms + URLs (10 fields)
  localPlatform: string; localUrl: string;
  devPlatform: string;   devUrl: string;
  intPlatform: string;   intUrl: string;
  uatPlatform: string;   uatUrl: string;
  prdPlatform: string;   prdUrl: string;
}

@Component({
  selector: 'app-appinfo-detail',
  imports: [RouterLink, FormsModule, TranslateModule],
  templateUrl: './appinfo-detail.html',
  styleUrl: './appinfo-detail.scss',
})
export class AppinfoDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(AtlasApi);
  private auth = inject(AuthService);
  readonly envs = ENVIRONMENTS;
  readonly statusOptions = STATUS_OPTIONS;

  loading = signal(true);
  error = signal<string | null>(null);
  app = signal<AppInfo | null>(null);
  squad = signal<Squad | null>(null);
  tribe = signal<Tribe | null>(null);
  subDomain = signal<SubDomain | null>(null);
  tribeDomain = signal<TribeDomain | null>(null);

  editMode = signal(false);
  saving = signal(false);
  saveError = signal<string | null>(null);
  edit = signal<AppEditModel>(this.blankModel());

  readonly canEdit = computed(() =>
    this.auth.canManageApp(this.squad(), {
      tribe: this.tribe(),
      subDomain: this.subDomain(),
      tribeDomain: this.tribeDomain(),
    }),
  );

  ngOnInit() {
    const appId = this.route.snapshot.paramMap.get('appId')!;
    this.api.getAppInfo(appId).pipe(
      switchMap((a) => {
        this.app.set(a);
        this.edit.set(this.modelOf(a));
        if (!a.squad) {
          this.loading.set(false);
          return of(null);
        }
        return this.api.getSquad(a.squad).pipe(catchError(() => of(null)));
      }),
      switchMap((s) => {
        if (!s) return of(null);
        this.squad.set(s);
        return forkJoin({
          tribe:       s.tribe       ? this.api.getTribe(s.tribe).pipe(catchError(() => of(null)))            : of(null),
          subDomain:   s.subDomain   ? this.api.getSubDomain(s.subDomain).pipe(catchError(() => of(null)))    : of(null),
          tribeDomain: s.tribeDomain ? this.api.getTribeDomain(s.tribeDomain).pipe(catchError(() => of(null))) : of(null),
        });
      }),
    ).subscribe({
      next: (parents) => {
        if (parents) {
          this.tribe.set(parents.tribe);
          this.subDomain.set(parents.subDomain);
          this.tribeDomain.set(parents.tribeDomain);
        }
        this.loading.set(false);
      },
      error: (e) => { this.error.set(e?.message ?? 'Failed to load'); this.loading.set(false); },
    });
  }

  startEdit() {
    if (!this.canEdit()) return;
    this.edit.set(this.modelOf(this.app()!));
    this.saveError.set(null);
    this.editMode.set(true);
  }

  cancelEdit() {
    this.editMode.set(false);
    this.saveError.set(null);
  }

  save() {
    if (!this.canEdit() || this.saving()) return;
    const m = this.edit();
    this.saving.set(true);
    this.saveError.set(null);
    const patch: Partial<AppInfo> = {
      status: (m.status || undefined) as AppStatus | undefined,
      gitRepo: m.gitRepo.trim(),
      localPlatform: m.localPlatform.trim(),  localUrl: m.localUrl.trim(),
      devPlatform: m.devPlatform.trim(),      devUrl: m.devUrl.trim(),
      intPlatform: m.intPlatform.trim(),      intUrl: m.intUrl.trim(),
      uatPlatform: m.uatPlatform.trim(),      uatUrl: m.uatUrl.trim(),
      prdPlatform: m.prdPlatform.trim(),      prdUrl: m.prdUrl.trim(),
    };
    this.api.patchAppInfo(this.app()!.appId, patch).subscribe({
      next: (a) => {
        this.app.set(a);
        this.editMode.set(false);
        this.saving.set(false);
      },
      error: (err) => {
        this.saveError.set(err?.error?.error || err?.message || 'Save failed');
        this.saving.set(false);
      },
    });
  }

  patch<K extends keyof AppEditModel>(field: K, value: AppEditModel[K]) {
    this.edit.update((m) => ({ ...m, [field]: value }));
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

  private blankModel(): AppEditModel {
    return {
      status: '', gitRepo: '',
      localPlatform: '', localUrl: '',
      devPlatform: '',   devUrl: '',
      intPlatform: '',   intUrl: '',
      uatPlatform: '',   uatUrl: '',
      prdPlatform: '',   prdUrl: '',
    };
  }

  private modelOf(a: AppInfo): AppEditModel {
    return {
      status: a.status || '',
      gitRepo: a.gitRepo || '',
      localPlatform: a.localPlatform || '', localUrl: a.localUrl || '',
      devPlatform:   a.devPlatform   || '', devUrl:   a.devUrl   || '',
      intPlatform:   a.intPlatform   || '', intUrl:   a.intUrl   || '',
      uatPlatform:   a.uatPlatform   || '', uatUrl:   a.uatUrl   || '',
      prdPlatform:   a.prdPlatform   || '', prdUrl:   a.prdUrl   || '',
    };
  }
}
