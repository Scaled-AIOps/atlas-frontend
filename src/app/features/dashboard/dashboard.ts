import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AtlasApi } from '../../core/api/atlas-api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private api = inject(AtlasApi);

  loading = signal(true);
  error = signal<string | null>(null);
  squadCount = signal(0);
  infraCount = signal(0);
  appinfoCount = signal(0);
  appstatusCount = signal(0);

  ngOnInit() {
    forkJoin({
      squads: this.api.listSquads().pipe(catchError(() => of([]))),
      infra: this.api.listInfra().pipe(catchError(() => of([]))),
      apps: this.api.listAppInfo().pipe(catchError(() => of([]))),
      statuses: this.api.listAppStatus().pipe(catchError(() => of([]))),
    }).subscribe({
      next: (r) => {
        this.squadCount.set(r.squads.length);
        this.infraCount.set(r.infra.length);
        this.appinfoCount.set(r.apps.length);
        this.appstatusCount.set(r.statuses.length);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.message ?? 'Failed to load');
        this.loading.set(false);
      },
    });
  }
}
