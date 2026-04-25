import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'atlas.auth';

export interface JiraLoginResponse {
  email: string;
  token: string;
  squads: string[];
  jira?: { accountId?: string; displayName?: string };
}

interface AuthState {
  token: string;
  email: string;
  squads: string[];
  displayName?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private base = environment.apiBaseUrl;

  private state = signal<AuthState | null>(null);

  readonly isAuthenticated = computed(() => !!this.state());
  readonly token = computed(() => this.state()?.token ?? null);
  readonly email = computed(() => this.state()?.email ?? '');
  readonly squads = computed(() => this.state()?.squads ?? []);
  readonly displayName = computed(() => this.state()?.displayName ?? '');

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

  loginJira(email: string, jiraToken: string): Observable<JiraLoginResponse> {
    return this.http
      .post<JiraLoginResponse>(`${this.base}/auth/login/jira`, { email, jiraToken })
      .pipe(tap((r) => this.persist(r)));
  }

  logout() {
    this.state.set(null);
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
    this.router.navigate(['/login']);
  }

  private persist(r: JiraLoginResponse) {
    const next: AuthState = {
      token: r.token,
      email: r.email,
      squads: r.squads,
      displayName: r.jira?.displayName,
    };
    this.state.set(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }
}
