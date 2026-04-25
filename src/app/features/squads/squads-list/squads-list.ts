import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AtlasApi } from '../../../core/api/atlas-api';
import { Squad } from '../../../core/api/models';
import { ListState } from '../../../shared/list-state';
import { ListControls } from '../../../shared/list-controls/list-controls';
import { Pagination } from '../../../shared/pagination/pagination';

@Component({
  selector: 'app-squads-list',
  imports: [RouterLink, ListControls, Pagination],
  templateUrl: './squads-list.html',
  styleUrl: './squads-list.scss',
})
export class SquadsList implements OnInit {
  private api = inject(AtlasApi);

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
      { key: 'tribeDomain', label: 'Tribe domain', pick: (s) => s.tribeDomain },
      { key: 'subDomain',   label: 'Sub-domain',   pick: (s) => s.subDomain },
      { key: 'tribe',       label: 'Tribe',        pick: (s) => s.tribe },
    ];
    this.state.sortFields = [
      { key: 'key',          label: 'Key',          pick: (s) => s.key },
      { key: 'name',         label: 'Name',         pick: (s) => s.name },
      { key: 'tribe',        label: 'Tribe',        pick: (s) => s.tribe },
      { key: 'tribeDomain',  label: 'Tribe domain', pick: (s) => s.tribeDomain },
    ];
    this.state.setSort('key', 'asc');
  }

  ngOnInit() {
    this.api.listSquads().subscribe({
      next: (s) => { this.state.setSource(s); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed to load'); this.loading.set(false); },
    });
  }
}
