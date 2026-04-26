import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Squad, SubDomain, Tribe, TribeDomain } from '../api/models';

const STORAGE_KEY = 'atlas.auth';

export interface TokenLoginResponse {
  email: string;
  token: string;
  squads: string[];
}

interface AuthState {
  token: string;
  email: string;
  squads: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private base = environment.apiBaseUrl;

  private state = signal<AuthState | null>(null);

  readonly isAuthenticated = computed(() => !!this.state());
  readonly token = computed(() => this.state()?.token ?? null);
  readonly userEmail = computed(() => this.state()?.email ?? '');
  readonly squads = computed(() => this.state()?.squads ?? []);
  readonly displayName = computed(() => {
    const e = this.state()?.email || '';
    if (!e) return '';
    return e.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  });

  /** Restore session from localStorage on app startup. */
  init() {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as AuthState;
      if (parsed && parsed.token && parsed.email) this.state.set(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /** Verify { email, token } against /auth/login/token, persist on success. */
  loginWithToken(email: string, token: string): Observable<TokenLoginResponse> {
    return this.http
      .post<TokenLoginResponse>(`${this.base}/auth/login/token`, { email, token })
      .pipe(tap((r) => this.persist(r)));
  }

  /**
   * Decide whether the signed-in user is allowed to edit the given squad.
   * Returns true when their email matches:
   *   - PO or SM of the squad
   *   - lead of the squad's tribe / sub-domain / tribe-domain
   *   - releaseManager of the squad's tribe (RMs sign off on every app, so
   *     editing the squad they're attached to is fair game)
   * Pass the parent records when known; missing parents are treated as
   * "no role on that tier" (deny by default for that path).
   */
  canManageSquad(
    squad: Squad | null | undefined,
    parents?: { tribe?: Tribe | null; subDomain?: SubDomain | null; tribeDomain?: TribeDomain | null },
  ): boolean {
    if (!squad) return false;
    const me = (this.userEmail() || '').toLowerCase();
    if (!me) return false;
    const eq = (v?: string) => !!v && v.toLowerCase() === me;
    if (eq(squad.po) || eq(squad.sm)) return true;
    if (parents?.tribe && (
      eq(parents.tribe.lead) ||
      eq(parents.tribe.releaseManager) ||
      eq(parents.tribe.agileCoach)
    )) return true;
    if (parents?.subDomain && eq(parents.subDomain.lead)) return true;
    if (parents?.tribeDomain && eq(parents.tribeDomain.lead)) return true;
    return false;
  }

  /**
   * Apps inherit their permissions from the owning squad. Same gate as
   * canManageSquad, applied to the app's parent.
   */
  canManageApp(
    squad: Squad | null | undefined,
    parents?: { tribe?: Tribe | null; subDomain?: SubDomain | null; tribeDomain?: TribeDomain | null },
  ): boolean {
    return this.canManageSquad(squad, parents);
  }

  logout() {
    this.state.set(null);
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
    this.router.navigate(['/login']);
  }

  private persist(r: TokenLoginResponse) {
    const next: AuthState = { token: r.token, email: r.email, squads: r.squads };
    this.state.set(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }
}
