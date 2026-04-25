import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  readonly nav = [
    { path: '/dashboard', label: 'Dashboard', icon: '◈' },
    { path: '/graph', label: 'Graph view', icon: '⌬' },
    { path: '/squads', label: 'Squads', icon: '◉' },
    { path: '/infra', label: 'Infrastructure', icon: '◇' },
    { path: '/appinfo', label: 'Applications', icon: '◆' },
    { path: '/appstatus', label: 'Deployments', icon: '◊' },
  ];
}
