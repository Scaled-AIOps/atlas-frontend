import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Locale, LocaleService, SUPPORTED_LOCALES } from '../../core/i18n/locale.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslateModule],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private locale = inject(LocaleService);
  private auth = inject(AuthService);
  readonly current = this.locale.current;
  readonly locales = SUPPORTED_LOCALES;
  readonly userEmail = this.auth.email;
  readonly userName = this.auth.displayName;

  readonly nav = [
    { path: '/dashboard', labelKey: 'nav.dashboard', icon: '◈' },
    { path: '/graph',     labelKey: 'nav.graph',     icon: '⌬' },
    { path: '/squads',    labelKey: 'nav.squads',    icon: '◉' },
    { path: '/infra',     labelKey: 'nav.infra',     icon: '◇' },
    { path: '/appinfo',   labelKey: 'nav.appinfo',   icon: '◆' },
    { path: '/appstatus', labelKey: 'nav.appstatus', icon: '◊' },
  ];

  setLocale(value: string) { this.locale.set(value as Locale); }

  signOut() { this.auth.logout(); }
}
