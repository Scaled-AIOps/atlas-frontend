import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AtlasApi } from '../../../core/api/atlas-api';
import { Squad } from '../../../core/api/models';

@Component({
  selector: 'app-squad-detail',
  imports: [RouterLink],
  templateUrl: './squad-detail.html',
  styleUrl: './squad-detail.scss',
})
export class SquadDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(AtlasApi);

  loading = signal(true);
  error = signal<string | null>(null);
  squad = signal<Squad | null>(null);

  ngOnInit() {
    const key = this.route.snapshot.paramMap.get('key')!;
    this.api.getSquad(key).subscribe({
      next: (s) => { this.squad.set(s); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed to load'); this.loading.set(false); },
    });
  }
}
