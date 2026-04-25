import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AtlasApi } from '../../../core/api/atlas-api';
import { SubDomain } from '../../../core/api/models';
import { ListState } from '../../../shared/list-state';
import { ListControls } from '../../../shared/list-controls/list-controls';
import { Pagination } from '../../../shared/pagination/pagination';

@Component({
  selector: 'app-subdomain-list',
  imports: [RouterLink, ListControls, Pagination, TranslateModule],
  templateUrl: './subdomain-list.html',
  styleUrl: './subdomain-list.scss',
})
export class SubdomainList implements OnInit {
  private api = inject(AtlasApi);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  error = signal<string | null>(null);
  state = new ListState<SubDomain>();

  constructor() {
    this.state.searchFields = [(s) => s.name, (s) => s.lead, (s) => s.description];
    this.state.filterFields = [
      { key: 'tribeDomain', label: 'subdomains.col.tribe_domain', pick: (s) => s.tribeDomain },
    ];
    this.state.sortFields = [
      { key: 'name',        label: 'subdomains.col.name',         pick: (s) => s.name },
      { key: 'tribeDomain', label: 'subdomains.col.tribe_domain', pick: (s) => s.tribeDomain },
      { key: 'lead',        label: 'subdomains.col.lead',         pick: (s) => s.lead },
    ];
    this.state.setSort('name', 'asc');
  }

  ngOnInit() {
    this.state.applyFilterParams(this.route.snapshot.queryParamMap);
    this.api.listSubDomains().subscribe({
      next: (s) => { this.state.setSource(s); this.loading.set(false); },
      error: (e) => { this.error.set(e?.message ?? 'Failed to load'); this.loading.set(false); },
    });
  }
}
