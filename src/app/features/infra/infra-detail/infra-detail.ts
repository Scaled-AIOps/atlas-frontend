import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AtlasApi } from '../../../core/api/atlas-api';
import { Infra } from '../../../core/api/models';

@Component({
  selector: 'app-infra-detail',
  imports: [RouterLink, TranslateModule],
  templateUrl: './infra-detail.html',
  styleUrl: './infra-detail.scss',
})
export class InfraDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(AtlasApi);

  loading = signal(true);
  error = signal<string | null>(null);
  infra = signal<Infra | null>(null);

  ngOnInit() {
    const platformId = this.route.snapshot.paramMap.get('platformId')!;
    this.api.getInfra(platformId).subscribe({
      next: (i) => { this.infra.set(i); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed to load'); this.loading.set(false); },
    });
  }

  tagEntries(tags: Record<string, unknown> | undefined) {
    return tags ? Object.entries(tags) : [];
  }
}
