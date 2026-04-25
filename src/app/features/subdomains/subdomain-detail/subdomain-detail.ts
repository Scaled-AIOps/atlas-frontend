import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AtlasApi } from '../../../core/api/atlas-api';
import { SubDomain, Tribe } from '../../../core/api/models';

@Component({
  selector: 'app-subdomain-detail',
  imports: [RouterLink, TranslateModule],
  templateUrl: './subdomain-detail.html',
  styleUrl: './subdomain-detail.scss',
})
export class SubdomainDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(AtlasApi);

  loading = signal(true);
  error = signal<string | null>(null);
  sub = signal<SubDomain | null>(null);
  tribes = signal<Tribe[]>([]);

  readonly children = computed(() =>
    this.tribes().filter((t) => t.subDomain === this.sub()?.name),
  );

  ngOnInit() {
    const name = this.route.snapshot.paramMap.get('name')!;
    forkJoin({
      s: this.api.getSubDomain(name),
      tribes: this.api.listTribes().pipe(catchError(() => of([]))),
    }).subscribe({
      next: (r) => { this.sub.set(r.s); this.tribes.set(r.tribes); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed to load'); this.loading.set(false); },
    });
  }
}
