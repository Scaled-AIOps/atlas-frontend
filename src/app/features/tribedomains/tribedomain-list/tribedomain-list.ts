import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AtlasApi } from '../../../core/api/atlas-api';
import { TribeDomain } from '../../../core/api/models';
import { ListState } from '../../../shared/list-state';
import { ListControls } from '../../../shared/list-controls/list-controls';
import { Pagination } from '../../../shared/pagination/pagination';

@Component({
  selector: 'app-tribedomain-list',
  imports: [RouterLink, ListControls, Pagination, TranslateModule],
  templateUrl: './tribedomain-list.html',
  styleUrl: './tribedomain-list.scss',
})
export class TribedomainList implements OnInit {
  private api = inject(AtlasApi);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  error = signal<string | null>(null);
  state = new ListState<TribeDomain>();

  constructor() {
    this.state.searchFields = [(d) => d.name, (d) => d.lead, (d) => d.description];
    this.state.sortFields = [
      { key: 'name', label: 'tribedomains.col.name', pick: (d) => d.name },
      { key: 'lead', label: 'tribedomains.col.lead', pick: (d) => d.lead },
    ];
    this.state.setSort('name', 'asc');
  }

  ngOnInit() {
    this.state.applyFilterParams(this.route.snapshot.queryParamMap);
    this.api.listTribeDomains().subscribe({
      next: (d) => { this.state.setSource(d); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed to load'); this.loading.set(false); },
    });
  }
}
