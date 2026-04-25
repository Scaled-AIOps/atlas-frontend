import { Routes } from '@angular/router';
import { Shell } from './shared/shell/shell';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'graph',
        loadComponent: () =>
          import('./features/graph/graph-view/graph-view').then(
            (m) => m.GraphView,
          ),
      },
      {
        path: 'squads',
        loadComponent: () =>
          import('./features/squads/squads-list/squads-list').then(
            (m) => m.SquadsList,
          ),
      },
      {
        path: 'squads/:key',
        loadComponent: () =>
          import('./features/squads/squad-detail/squad-detail').then(
            (m) => m.SquadDetail,
          ),
      },
      {
        path: 'infra',
        loadComponent: () =>
          import('./features/infra/infra-list/infra-list').then(
            (m) => m.InfraList,
          ),
      },
      {
        path: 'infra/:platformId',
        loadComponent: () =>
          import('./features/infra/infra-detail/infra-detail').then(
            (m) => m.InfraDetail,
          ),
      },
      {
        path: 'appinfo',
        loadComponent: () =>
          import('./features/appinfo/appinfo-list/appinfo-list').then(
            (m) => m.AppinfoList,
          ),
      },
      {
        path: 'appinfo/:appId',
        loadComponent: () =>
          import('./features/appinfo/appinfo-detail/appinfo-detail').then(
            (m) => m.AppinfoDetail,
          ),
      },
      {
        path: 'appstatus',
        loadComponent: () =>
          import('./features/appstatus/appstatus-list/appstatus-list').then(
            (m) => m.AppstatusList,
          ),
      },
      {
        path: 'appstatus/:appId',
        loadComponent: () =>
          import('./features/appstatus/appstatus-detail/appstatus-detail').then(
            (m) => m.AppstatusDetail,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
