import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type Locale = 'en' | 'de';
export const SUPPORTED_LOCALES: Locale[] = ['en', 'de'];

const STORAGE_KEY = 'atlas.locale';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private translate = inject(TranslateService);
  current = signal<Locale>('en');

  init() {
    const stored = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) as Locale | null;
    const browser = (typeof navigator !== 'undefined' ? navigator.language : 'en').slice(0, 2);
    const initial: Locale = stored && SUPPORTED_LOCALES.includes(stored)
      ? stored
      : (SUPPORTED_LOCALES.includes(browser as Locale) ? (browser as Locale) : 'en');

    this.translate.addLangs(SUPPORTED_LOCALES);
    this.translate.setDefaultLang('en');
    this.translate.use(initial);
    this.current.set(initial);
  }

  set(lang: Locale) {
    if (!SUPPORTED_LOCALES.includes(lang)) return;
    this.translate.use(lang);
    this.current.set(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  }
}
