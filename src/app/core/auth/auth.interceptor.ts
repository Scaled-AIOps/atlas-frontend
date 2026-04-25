import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

/**
 * Adds `Authorization: Bearer <token>` to requests targeting the atlas-service
 * base URL, and clears the session + routes to /login on 401.
 *
 * Skips the login endpoints themselves so the original error code (NOT_MEMBER,
 * EMAIL_MISMATCH, etc.) reaches the login screen instead of being trapped here.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const base = environment.apiBaseUrl;

  const isApiCall = req.url.startsWith(base) || req.url.startsWith('/api');
  const isLoginCall = req.url.includes('/auth/login');
  const token = auth.token();

  const augmented = isApiCall && token && !isLoginCall
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(augmented).pipe(
    catchError((err) => {
      if (err?.status === 401 && isApiCall && !isLoginCall) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
