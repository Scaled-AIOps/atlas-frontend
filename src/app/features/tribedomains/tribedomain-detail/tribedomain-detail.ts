import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AtlasApi } from '../../../core/api/atlas-api';
import { SubDomain, TribeDomain } from '../../../core/api/models';

@Component({
  selector: 'app-tribedomain-detail',
  imports: [RouterLink, TranslateModule],
  templateUrl: './tribedomain-detail.html',
  styleUrl: './tribedomain-detail.scss',
})
export class TribedomainDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(AtlasApi);

  loading = signal(true);
  error = signal<string | null>(null);
  domain = signal<TribeDomain | null>(null);
  subDomains = signal<SubDomain[]>([]);

  readonly children = computed(() =>
    this.subDomains().filter((s) => s.tribeDomain === this.domain()?.name),
  );

  ngOnInit() {
    const name = this.route.snapshot.paramMap.get('name')!;
    forkJoin({
      d: this.api.getTribeDomain(name),
      subs: this.api.listSubDomains().pipe(catchError(() => of([]))),
    }).subscribe({
      next: (r) => { this.domain.set(r.d); this.subDomains.set(r.subs); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed to load'); this.loading.set(false); },
    });
  }
}
