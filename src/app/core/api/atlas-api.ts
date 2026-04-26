import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Squad,
  Infra,
  AppInfo,
  AppStatusRecord,
  DeployEntry,
  Environment,
  TribeDomain,
  SubDomain,
  Tribe,
} from './models';

@Injectable({ providedIn: 'root' })
export class AtlasApi {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  // ── Tribe Domains ─────────────────────────────────────────────────────
  listTribeDomains(): Observable<TribeDomain[]> {
    return this.http.get<TribeDomain[]>(`${this.base}/tribedomains`);
  }
  getTribeDomain(name: string): Observable<TribeDomain> {
    return this.http.get<TribeDomain>(`${this.base}/tribedomains/${encodeURIComponent(name)}`);
  }

  // ── Sub-Domains ───────────────────────────────────────────────────────
  listSubDomains(): Observable<SubDomain[]> {
    return this.http.get<SubDomain[]>(`${this.base}/subdomains`);
  }
  getSubDomain(name: string): Observable<SubDomain> {
    return this.http.get<SubDomain>(`${this.base}/subdomains/${encodeURIComponent(name)}`);
  }

  // ── Tribes ────────────────────────────────────────────────────────────
  listTribes(): Observable<Tribe[]> {
    return this.http.get<Tribe[]>(`${this.base}/tribes`);
  }
  getTribe(name: string): Observable<Tribe> {
    return this.http.get<Tribe>(`${this.base}/tribes/${encodeURIComponent(name)}`);
  }

  // ── Squads ────────────────────────────────────────────────────────────
  listSquads(): Observable<Squad[]> {
    return this.http.get<Squad[]>(`${this.base}/squads`);
  }
  getSquad(key: string): Observable<Squad> {
    return this.http.get<Squad>(`${this.base}/squads/${key}`);
  }
  patchSquad(key: string, patch: Partial<Squad>): Observable<Squad> {
    return this.http.patch<Squad>(`${this.base}/squads/${key}`, patch);
  }

  // ── Infra ─────────────────────────────────────────────────────────────
  listInfra(): Observable<Infra[]> {
    return this.http.get<Infra[]>(`${this.base}/infra`);
  }
  getInfra(platformId: string): Observable<Infra> {
    return this.http.get<Infra>(`${this.base}/infra/${platformId}`);
  }

  // ── AppInfo ───────────────────────────────────────────────────────────
  listAppInfo(): Observable<AppInfo[]> {
    return this.http.get<AppInfo[]>(`${this.base}/appinfo`);
  }
  getAppInfo(appId: string): Observable<AppInfo> {
    return this.http.get<AppInfo>(`${this.base}/appinfo/${appId}`);
  }
  patchAppInfo(appId: string, patch: Partial<AppInfo>): Observable<AppInfo> {
    return this.http.patch<AppInfo>(`${this.base}/appinfo/${appId}`, patch);
  }

  // ── AppStatus ─────────────────────────────────────────────────────────
  listAppStatus(): Observable<AppStatusRecord[]> {
    return this.http.get<AppStatusRecord[]>(`${this.base}/appstatus`);
  }
  getAppStatus(appId: string): Observable<AppStatusRecord> {
    return this.http.get<AppStatusRecord>(`${this.base}/appstatus/${appId}`);
  }
  getAppStatusEnv(
    appId: string,
    env: Environment,
  ): Observable<DeployEntry[]> {
    return this.http.get<DeployEntry[]>(
      `${this.base}/appstatus/${appId}/${env}`,
    );
  }

  // ── Health / Info ─────────────────────────────────────────────────────
  health(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${this.base}/health`);
  }
  info(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/info`);
  }
}
