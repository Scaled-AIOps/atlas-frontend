import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Locale, LocaleService, SUPPORTED_LOCALES } from '../../core/i18n/locale.service';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslateModule],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private locale = inject(LocaleService);
  readonly current = this.locale.current;
  readonly locales = SUPPORTED_LOCALES;

  readonly nav = [
    { path: '/dashboard', labelKey: 'nav.dashboard', icon: '◈' },
    { path: '/graph',     labelKey: 'nav.graph',     icon: '⌬' },
    { path: '/squads',    labelKey: 'nav.squads',    icon: '◉' },
    { path: '/infra',     labelKey: 'nav.infra',     icon: '◇' },
    { path: '/appinfo',   labelKey: 'nav.appinfo',   icon: '◆' },
    { path: '/appstatus', labelKey: 'nav.appstatus', icon: '◊' },
  ];

  setLocale(value: string) {
    this.locale.set(value as Locale);
  }
}
