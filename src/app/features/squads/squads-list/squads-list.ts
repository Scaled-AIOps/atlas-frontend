import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AtlasApi } from '../../../core/api/atlas-api';
import { Squad } from '../../../core/api/models';
import { ListState } from '../../../shared/list-state';
import { ListControls } from '../../../shared/list-controls/list-controls';
import { Pagination } from '../../../shared/pagination/pagination';

@Component({
  selector: 'app-squads-list',
  imports: [RouterLink, ListControls, Pagination, TranslateModule],
  templateUrl: './squads-list.html',
  styleUrl: './squads-list.scss',
})
export class SquadsList implements OnInit {
  private api = inject(AtlasApi);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  error = signal<string | null>(null);
  state = new ListState<Squad>();

  constructor() {
    this.state.searchFields = [
      (s) => s.key,
      (s) => s.name,
      (s) => s.po,
      (s) => s.sm,
      (s) => s.tribe,
    ];
    this.state.filterFields = [
      { key: 'tribeDomain', label: 'squads.col.tribe_domain', pick: (s) => s.tribeDomain },
      { key: 'subDomain',   label: 'squads.col.sub_domain',   pick: (s) => s.subDomain },
      { key: 'tribe',       label: 'squads.col.tribe',        pick: (s) => s.tribe },
    ];
    this.state.sortFields = [
      { key: 'key',          label: 'squads.col.key',          pick: (s) => s.key },
      { key: 'name',         label: 'squads.col.name',         pick: (s) => s.name },
      { key: 'tribe',        label: 'squads.col.tribe',        pick: (s) => s.tribe },
      { key: 'tribeDomain',  label: 'squads.col.tribe_domain', pick: (s) => s.tribeDomain },
    ];
    this.state.setSort('key', 'asc');
  }

  ngOnInit() {
    this.state.applyFilterParams(this.route.snapshot.queryParamMap);
    this.api.listSquads().subscribe({
      next: (s) => { this.state.setSource(s); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed to load'); this.loading.set(false); },
    });
  }
}
