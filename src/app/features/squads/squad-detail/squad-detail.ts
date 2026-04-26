import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AtlasApi } from '../../../core/api/atlas-api';
import { Squad, SubDomain, Tribe, TribeDomain } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth.service';

interface SquadEditModel {
  name: string;
  description: string;
  po: string;
  sm: string;
  ao: string;            // comma-separated
  mailingList: string;
  members: string;
  jira: string;
  github: string;
  confluence: string;
}

@Component({
  selector: 'app-squad-detail',
  imports: [RouterLink, FormsModule, TranslateModule],
  templateUrl: './squad-detail.html',
  styleUrl: './squad-detail.scss',
})
export class SquadDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(AtlasApi);
  private auth = inject(AuthService);

  loading = signal(true);
  error = signal<string | null>(null);
  squad = signal<Squad | null>(null);
  tribe = signal<Tribe | null>(null);
  subDomain = signal<SubDomain | null>(null);
  tribeDomain = signal<TribeDomain | null>(null);

  editMode = signal(false);
  saving = signal(false);
  saveError = signal<string | null>(null);
  edit = signal<SquadEditModel>(this.blankModel());

  readonly canEdit = computed(() =>
    this.auth.canManageSquad(this.squad(), {
      tribe: this.tribe(),
      subDomain: this.subDomain(),
      tribeDomain: this.tribeDomain(),
    }),
  );

  ngOnInit() {
    const key = this.route.snapshot.paramMap.get('key')!;
    this.api.getSquad(key).subscribe({
      next: (s) => {
        this.squad.set(s);
        this.edit.set(this.modelOf(s));
        this.loadParents(s);
      },
      error: (e) => { this.error.set(e?.message ?? 'Failed to load'); this.loading.set(false); },
    });
  }

  private loadParents(s: Squad) {
    forkJoin({
      tribe:       s.tribe       ? this.api.getTribe(s.tribe).pipe(catchError(() => of(null)))            : of(null),
      subDomain:   s.subDomain   ? this.api.getSubDomain(s.subDomain).pipe(catchError(() => of(null)))    : of(null),
      tribeDomain: s.tribeDomain ? this.api.getTribeDomain(s.tribeDomain).pipe(catchError(() => of(null))) : of(null),
    }).subscribe({
      next: (r) => {
        this.tribe.set(r.tribe);
        this.subDomain.set(r.subDomain);
        this.tribeDomain.set(r.tribeDomain);
        this.loading.set(false);
      },
    });
  }

  startEdit() {
    if (!this.canEdit()) return;
    this.edit.set(this.modelOf(this.squad()!));
    this.saveError.set(null);
    this.editMode.set(true);
  }

  cancelEdit() {
    this.editMode.set(false);
    this.saveError.set(null);
  }

  save() {
    if (!this.canEdit() || this.saving()) return;
    const m = this.edit();
    this.saving.set(true);
    this.saveError.set(null);
    const patch: Partial<Squad> = {
      name: m.name.trim(),
      description: m.description.trim(),
      po: m.po.trim(),
      sm: m.sm.trim(),
      ao: this.split(m.ao),
      mailingList: this.split(m.mailingList),
      members: this.split(m.members),
      jira: m.jira.trim(),
      github: m.github.trim(),
      confluence: m.confluence.trim(),
    };
    this.api.patchSquad(this.squad()!.key, patch).subscribe({
      next: (s) => {
        this.squad.set(s);
        this.editMode.set(false);
        this.saving.set(false);
      },
      error: (err) => {
        this.saveError.set(err?.error?.error || err?.message || 'Save failed');
        this.saving.set(false);
      },
    });
  }

  patch<K extends keyof SquadEditModel>(field: K, value: SquadEditModel[K]) {
    this.edit.update((m) => ({ ...m, [field]: value }));
  }

  private blankModel(): SquadEditModel {
    return { name: '', description: '', po: '', sm: '', ao: '', mailingList: '', members: '', jira: '', github: '', confluence: '' };
  }

  private modelOf(s: Squad): SquadEditModel {
    return {
      name: s.name || '',
      description: s.description || '',
      po: s.po || '',
      sm: s.sm || '',
      ao: (s.ao || []).join(', '),
      mailingList: (s.mailingList || []).join(', '),
      members: (s.members || []).join(', '),
      jira: s.jira || '',
      github: s.github || '',
      confluence: s.confluence || '',
    };
  }

  private split(v: string): string[] {
    return v.split(',').map((x) => x.trim()).filter(Boolean);
  }
}
