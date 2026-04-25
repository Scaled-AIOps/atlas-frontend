import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AtlasApi } from '../../../core/api/atlas-api';
import { AppStatusRecord, DeployEntry, ENVIRONMENTS, Environment } from '../../../core/api/models';

@Component({
  selector: 'app-appstatus-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './appstatus-detail.html',
  styleUrl: './appstatus-detail.scss',
})
export class AppstatusDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(AtlasApi);
  readonly envs = ENVIRONMENTS;

  loading = signal(true);
  error = signal<string | null>(null);
  record = signal<AppStatusRecord | null>(null);

  ngOnInit() {
    const appId = this.route.snapshot.paramMap.get('appId')!;
    this.api.getAppStatus(appId).subscribe({
      next: (r) => { this.record.set(r); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed to load'); this.loading.set(false); },
    });
  }

  entriesDesc(record: AppStatusRecord, env: Environment): DeployEntry[] {
    const list = record[env] ?? [];
    return [...list].sort(
      (a, b) => new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime(),
    );
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
