import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, TranslateModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = signal('');
  jiraToken = signal('');
  loading = signal(false);
  errorCode = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  readonly canSubmit = computed(() =>
    !this.loading() && !!this.email().trim() && !!this.jiraToken().trim(),
  );

  ngOnInit() {
    if (this.auth.isAuthenticated()) {
      this.router.navigateByUrl(this.returnUrl());
    }
  }

  submit() {
    if (!this.canSubmit()) return;
    this.errorCode.set(null);
    this.errorMessage.set(null);
    this.loading.set(true);

    this.auth.loginJira(this.email().trim(), this.jiraToken().trim()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl(this.returnUrl());
      },
      error: (err) => {
        this.loading.set(false);
        const code = err?.error?.code || 'UNKNOWN';
        this.errorCode.set(code);
        this.errorMessage.set(err?.error?.error || err?.message || '');
      },
    });
  }

  private returnUrl(): string {
    return this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
  }
}
