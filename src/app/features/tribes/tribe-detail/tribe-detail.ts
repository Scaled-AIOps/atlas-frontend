import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AtlasApi } from '../../../core/api/atlas-api';
import { Squad, Tribe } from '../../../core/api/models';

@Component({
  selector: 'app-tribe-detail',
  imports: [RouterLink, TranslateModule],
  templateUrl: './tribe-detail.html',
  styleUrl: './tribe-detail.scss',
})
export class TribeDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(AtlasApi);

  loading = signal(true);
  error = signal<string | null>(null);
  tribe = signal<Tribe | null>(null);
  squads = signal<Squad[]>([]);

  /** Squads whose `tribe` field matches this tribe's name. */
  readonly squadsInTribe = computed(() =>
    this.squads().filter((s) => s.tribe === this.tribe()?.name),
  );

  ngOnInit() {
    const name = this.route.snapshot.paramMap.get('name')!;
    forkJoin({
      t: this.api.getTribe(name),
      squads: this.api.listSquads().pipe(catchError(() => of([]))),
    }).subscribe({
      next: (r) => { this.tribe.set(r.t); this.squads.set(r.squads); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed to load'); this.loading.set(false); },
    });
  }
}
