import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

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
