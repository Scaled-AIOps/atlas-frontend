import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { KeyValuePipe } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Network, Options } from 'vis-network';
import { DataSet } from 'vis-data';
import { AtlasApi } from '../../../core/api/atlas-api';
import { AppInfo, AppStatus, Squad } from '../../../core/api/models';

type LayoutMode = 'hierarchical' | 'force';
type NodeKind = 'tribeDomain' | 'subDomain' | 'tribe' | 'squad' | 'app';

interface GraphNode {
  id: string;
  label: string;
  kind: NodeKind;
  title?: string;
  shape?: string;
  level?: number;
  color?: { background: string; border: string; highlight?: { background: string; border: string } };
  font?: { color?: string; size?: number; bold?: boolean };
  margin?: any;
  widthConstraint?: any;
  shapeProperties?: any;
  borderWidth?: number;
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  color?: { color?: string; highlight?: string; opacity?: number };
  width?: number;
  smooth?: any;
  dashes?: boolean;
}

interface SelectedNode {
  kind: NodeKind;
  id: string;
  label: string;
  meta: Record<string, string>;
  neighbors: { id: string; kind: NodeKind; label: string }[];
}

// Curated palette: each entry gives a hue used as the "river of color" for one
// tribeDomain. Index 0 = darkest (level 0 node), index 4 = lightest (app node).
const PALETTE: Record<string, string[]> = {
  blue:    ['#1e3a8a', '#1e40af', '#2563eb', '#60a5fa', '#dbeafe'],
  teal:    ['#115e59', '#0f766e', '#0d9488', '#5eead4', '#ccfbf1'],
  purple:  ['#4c1d95', '#6d28d9', '#7c3aed', '#a78bfa', '#ede9fe'],
  amber:   ['#78350f', '#b45309', '#d97706', '#fbbf24', '#fef3c7'],
  rose:    ['#881337', '#9f1239', '#e11d48', '#fb7185', '#ffe4e6'],
  emerald: ['#064e3b', '#047857', '#059669', '#34d399', '#d1fae5'],
  indigo:  ['#312e81', '#4338ca', '#4f46e5', '#818cf8', '#e0e7ff'],
  cyan:    ['#164e63', '#0e7490', '#0891b2', '#22d3ee', '#cffafe'],
};
const HUE_KEYS = Object.keys(PALETTE);

const STATUS_BORDER: Record<AppStatus, string> = {
  active:                       '#2563eb',
  inactive:                     '#94a3b8',
  'marked-for-decommissioning': '#d97706',
  failed:                       '#dc2626',
};

@Component({
  selector: 'app-graph-view',
  imports: [FormsModule, KeyValuePipe],
  templateUrl: './graph-view.html',
  styleUrl: './graph-view.scss',
})
export class GraphView implements OnInit, OnDestroy {
  private api = inject(AtlasApi);
  private router = inject(Router);

  graphHost = viewChild<ElementRef<HTMLDivElement>>('graphHost');

  // ── State ────────────────────────────────────────────────────────
  loading = signal(true);
  error = signal<string | null>(null);
  layout = signal<LayoutMode>('hierarchical');
  search = signal('');
  hideInactive = signal(false);
  selected = signal<SelectedNode | null>(null);

  domainCount = signal(0);
  subDomainCount = signal(0);
  tribeCount = signal(0);
  squadCount = signal(0);
  appCount = signal(0);
  edgeCount = signal(0);

  // [{ name, color }] for legend
  domains = signal<{ name: string; color: string }[]>([]);

  // ── Internals ───────────────────────────────────────────────────
  private network?: Network;
  private nodesDS = new DataSet<GraphNode>();
  private edgesDS = new DataSet<GraphEdge>();
  private squads: Squad[] = [];
  private apps: AppInfo[] = [];
  private squadsByKey = new Map<string, Squad>();
  private appsById = new Map<string, AppInfo>();
  private domainHue = new Map<string, string[]>(); // domain → palette tints
  // Reverse lookup: app/squad/tribe/subDomain → tribeDomain so neighbor lists & details work.
  private parentByNodeId = new Map<string, string[]>();

  constructor() {
    effect(() => {
      this.layout(); this.hideInactive();
      if (!this.loading() && this.graphHost()?.nativeElement) this.rebuild();
    });

    effect(() => {
      const q = this.search().trim().toLowerCase();
      if (this.network) this.applyHighlight(q);
    });
  }

  ngOnInit() {
    forkJoin({
      squads: this.api.listSquads().pipe(catchError(() => of([] as Squad[]))),
      apps: this.api.listAppInfo().pipe(catchError(() => of([] as AppInfo[]))),
    }).subscribe({
      next: (r) => {
        this.squads = r.squads;
        this.apps = r.apps;
        this.squadsByKey = new Map(r.squads.map((s) => [s.key, s]));
        this.appsById = new Map(r.apps.map((a) => [a.appId, a]));
        this.loading.set(false);
        const tryRender = () => {
          if (this.graphHost()?.nativeElement) this.rebuild();
          else requestAnimationFrame(tryRender);
        };
        requestAnimationFrame(tryRender);
      },
      error: (e) => {
        this.error.set(e?.message ?? 'Failed to load');
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy() { this.network?.destroy(); }

  // ── User actions ───────────────────────────────────────────────
  setLayout(m: LayoutMode) { this.layout.set(m); }
  toggleInactive() { this.hideInactive.update((v) => !v); }
  fitToView() { this.network?.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } }); }
  clearSelection() {
    this.selected.set(null);
    this.network?.unselectAll();
    this.applyHighlight(this.search().trim().toLowerCase());
  }
  goToSelected() {
    const sel = this.selected();
    if (!sel) return;
    if (sel.kind === 'squad') this.router.navigate(['/squads', sel.id.replace('squad:', '')]);
    else if (sel.kind === 'app') this.router.navigate(['/appinfo', sel.id.replace('app:', '')]);
  }

  // ── Build ──────────────────────────────────────────────────────
  private buildData(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const isHier = this.layout() === 'hierarchical';
    const hideInactive = this.hideInactive();

    // 1. Assign each tribeDomain a hue from the palette (deterministic by sorted order).
    const domainNames = Array.from(
      new Set(this.squads.map((s) => s.tribeDomain || 'Uncategorized').filter(Boolean)),
    ).sort();
    this.domainHue.clear();
    domainNames.forEach((d, i) => {
      this.domainHue.set(d, PALETTE[HUE_KEYS[i % HUE_KEYS.length]]);
    });
    this.domains.set(domainNames.map((d) => ({ name: d, color: this.domainHue.get(d)![1] })));

    // 2. Build distinct sets of (tribeDomain, subDomain, tribe) tuples.
    const tribeDomains = new Set<string>();
    const subDomains = new Map<string, { name: string; domain: string }>();      // id -> meta
    const tribes = new Map<string, { name: string; domain: string; sub: string }>();

    this.parentByNodeId.clear();

    for (const s of this.squads) {
      const td = s.tribeDomain || 'Uncategorized';
      const sd = s.subDomain || '—';
      const tb = s.tribe || '—';
      tribeDomains.add(td);
      const sdId = `sub:${td}::${sd}`;
      const tbId = `tribe:${td}::${sd}::${tb}`;
      subDomains.set(sdId, { name: sd, domain: td });
      tribes.set(tbId, { name: tb, domain: td, sub: sd });
      this.parentByNodeId.set(`squad:${s.key}`, [td]);
      this.parentByNodeId.set(tbId, [td]);
      this.parentByNodeId.set(sdId, [td]);
    }
    for (const a of this.apps) {
      if (!a.squad) continue;
      const sq = this.squadsByKey.get(a.squad);
      const td = sq?.tribeDomain || 'Uncategorized';
      this.parentByNodeId.set(`app:${a.appId}`, [td]);
    }

    this.domainCount.set(tribeDomains.size);
    this.subDomainCount.set(subDomains.size);
    this.tribeCount.set(tribes.size);
    this.squadCount.set(this.squads.length);

    // 3. Emit tribeDomain nodes (level 0).
    for (const td of tribeDomains) {
      const tints = this.domainHue.get(td)!;
      nodes.push({
        id: `td:${td}`,
        label: td,
        kind: 'tribeDomain',
        title: `Tribe Domain — ${td}`,
        shape: 'box',
        level: isHier ? 0 : undefined,
        color: { background: tints[0], border: tints[0] },
        font: { color: '#ffffff', size: 16, bold: true },
        margin: { top: 12, right: 18, bottom: 12, left: 18 },
        shapeProperties: { borderRadius: 10 },
        borderWidth: 0,
      });
    }

    // 4. subDomain nodes (level 1).
    for (const [sdId, sd] of subDomains) {
      const tints = this.domainHue.get(sd.domain)!;
      nodes.push({
        id: sdId,
        label: sd.name,
        kind: 'subDomain',
        title: `Sub-domain — ${sd.name}\nTribe Domain: ${sd.domain}`,
        shape: 'box',
        level: isHier ? 1 : undefined,
        color: { background: tints[1], border: tints[1] },
        font: { color: '#ffffff', size: 14, bold: true },
        margin: { top: 10, right: 14, bottom: 10, left: 14 },
        shapeProperties: { borderRadius: 8 },
        borderWidth: 0,
      });
      edges.push({
        id: `e:td:${sd.domain}->${sdId}`,
        from: `td:${sd.domain}`,
        to: sdId,
        color: { color: tints[2], highlight: tints[1], opacity: 0.7 },
        width: 2,
      });
    }

    // 5. tribe nodes (level 2).
    for (const [tbId, tb] of tribes) {
      const tints = this.domainHue.get(tb.domain)!;
      nodes.push({
        id: tbId,
        label: tb.name,
        kind: 'tribe',
        title: `Tribe — ${tb.name}\nSub-domain: ${tb.sub}\nDomain: ${tb.domain}`,
        shape: 'box',
        level: isHier ? 2 : undefined,
        color: { background: tints[2], border: tints[2] },
        font: { color: '#ffffff', size: 13, bold: true },
        margin: { top: 8, right: 12, bottom: 8, left: 12 },
        shapeProperties: { borderRadius: 6 },
        borderWidth: 0,
      });
      edges.push({
        id: `e:sub:${tb.domain}::${tb.sub}->${tbId}`,
        from: `sub:${tb.domain}::${tb.sub}`,
        to: tbId,
        color: { color: tints[2], highlight: tints[1], opacity: 0.7 },
        width: 1.5,
      });
    }

    // 6. squad nodes (level 3).
    for (const s of this.squads) {
      const td = s.tribeDomain || 'Uncategorized';
      const sd = s.subDomain || '—';
      const tb = s.tribe || '—';
      const tints = this.domainHue.get(td)!;
      nodes.push({
        id: `squad:${s.key}`,
        label: s.name || s.key,
        kind: 'squad',
        title: this.squadTooltip(s),
        shape: 'ellipse',
        level: isHier ? 3 : undefined,
        color: { background: tints[3], border: tints[2] },
        font: { color: '#0f172a', size: 12, bold: true },
        borderWidth: 1.5,
      });
      edges.push({
        id: `e:tribe:${td}::${sd}::${tb}->squad:${s.key}`,
        from: `tribe:${td}::${sd}::${tb}`,
        to: `squad:${s.key}`,
        color: { color: tints[3], highlight: tints[1], opacity: 0.7 },
        width: 1.2,
      });
    }

    // 7. app nodes (level 4).
    for (const a of this.apps) {
      if (!a.squad) continue;
      if (hideInactive && a.status && a.status !== 'active') continue;
      const sq = this.squadsByKey.get(a.squad);
      const td = sq?.tribeDomain || 'Uncategorized';
      const tints = this.domainHue.get(td)!;
      const border = a.status ? STATUS_BORDER[a.status] : tints[2];

      nodes.push({
        id: `app:${a.appId}`,
        label: a.appId,
        kind: 'app',
        title: this.appTooltip(a),
        shape: 'box',
        level: isHier ? 4 : undefined,
        color: { background: tints[4], border },
        font: { color: '#1e293b', size: 11 },
        margin: { top: 6, right: 10, bottom: 6, left: 10 },
        shapeProperties: { borderRadius: 4 },
        borderWidth: a.status === 'active' || !a.status ? 1 : 2,
      });
      edges.push({
        id: `e:squad:${a.squad}->app:${a.appId}`,
        from: `squad:${a.squad}`,
        to: `app:${a.appId}`,
        color: { color: tints[3], highlight: tints[1], opacity: 0.6 },
        width: 1,
      });
    }

    this.appCount.set(this.apps.filter((a) => !!a.squad && (!hideInactive || a.status === 'active' || !a.status)).length);
    return { nodes, edges };
  }

  private rebuild() {
    const el = this.graphHost()?.nativeElement;
    if (!el) return;

    const { nodes, edges } = this.buildData();
    this.edgeCount.set(edges.length);

    this.nodesDS.clear();
    this.edgesDS.clear();
    this.nodesDS.add(nodes);
    this.edgesDS.add(edges);

    const isHier = this.layout() === 'hierarchical';

    const options: Options = {
      autoResize: true,
      nodes: {
        font: { face: 'Inter, sans-serif' },
        shadow: { enabled: true, size: 6, x: 0, y: 2, color: 'rgba(15,23,42,0.10)' },
      },
      edges: {
        arrows: { to: { enabled: false } },
        smooth: isHier
          ? { enabled: true, type: 'cubicBezier', forceDirection: 'horizontal', roundness: 0.65 }
          : { enabled: true, type: 'continuous', roundness: 0.4 },
        selectionWidth: 1.5,
      },
      layout: isHier
        ? {
            hierarchical: {
              enabled: true,
              direction: 'LR',
              sortMethod: 'directed',
              shakeTowards: 'roots',
              levelSeparation: 220,
              nodeSpacing: 32,
              treeSpacing: 80,
              blockShifting: true,
              edgeMinimization: true,
              parentCentralization: true,
            },
          }
        : { improvedLayout: true },
      physics: isHier
        ? { enabled: false }
        : {
            enabled: true,
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
              gravitationalConstant: -80,
              centralGravity: 0.012,
              springLength: 130,
              springConstant: 0.08,
              avoidOverlap: 0.7,
            },
            stabilization: { enabled: true, iterations: 350, fit: true },
          },
      interaction: {
        hover: true,
        tooltipDelay: 150,
        keyboard: true,
        zoomSpeed: 0.7,
      },
      groups: { useDefaultGroups: false } as any,
    };

    this.network?.destroy();
    this.network = new Network(
      el,
      { nodes: this.nodesDS as any, edges: this.edgesDS as any },
      options,
    );

    if (isHier) {
      setTimeout(() => this.network?.fit(), 50);
    } else {
      this.network.on('stabilizationIterationsDone', () => {
        this.network?.fit();
        this.network?.setOptions({ physics: { enabled: false } });
      });
    }

    this.network.on('selectNode', (params) => {
      const id = params.nodes?.[0] as string | undefined;
      if (id) this.onNodeSelected(id);
    });
    this.network.on('deselectNode', () => this.clearSelection());
    this.network.on('doubleClick', (params) => {
      const id = params.nodes?.[0] as string | undefined;
      if (!id) return;
      if (id.startsWith('squad:')) this.router.navigate(['/squads', id.slice(6)]);
      else if (id.startsWith('app:')) this.router.navigate(['/appinfo', id.slice(4)]);
    });

    this.applyHighlight(this.search().trim().toLowerCase());
  }

  // ── Selection / highlight ─────────────────────────────────────
  private onNodeSelected(nodeId: string) {
    const node = this.nodesDS.get(nodeId);
    if (!node) return;
    const neighbors: SelectedNode['neighbors'] = [];
    const meta: Record<string, string> = {};

    if (node.kind === 'tribeDomain') {
      const td = nodeId.slice(3);
      meta['Tribe domain'] = td;
      // sub-domains under it
      for (const s of this.squads) {
        if ((s.tribeDomain || 'Uncategorized') !== td) continue;
      }
      const subs = new Set<string>();
      for (const s of this.squads) {
        if ((s.tribeDomain || 'Uncategorized') === td) subs.add(s.subDomain || '—');
      }
      for (const sd of subs) {
        neighbors.push({ id: `sub:${td}::${sd}`, kind: 'subDomain', label: sd });
      }
    } else if (node.kind === 'subDomain') {
      const [td, sd] = nodeId.slice(4).split('::');
      meta['Tribe domain'] = td;
      meta['Sub-domain'] = sd;
      const tribesSet = new Set<string>();
      for (const s of this.squads) {
        if ((s.tribeDomain || 'Uncategorized') === td && (s.subDomain || '—') === sd) {
          tribesSet.add(s.tribe || '—');
        }
      }
      for (const tb of tribesSet) {
        neighbors.push({ id: `tribe:${td}::${sd}::${tb}`, kind: 'tribe', label: tb });
      }
    } else if (node.kind === 'tribe') {
      const [td, sd, tb] = nodeId.slice(6).split('::');
      meta['Tribe'] = tb;
      meta['Sub-domain'] = sd;
      meta['Tribe domain'] = td;
      for (const s of this.squads) {
        if ((s.tribeDomain || 'Uncategorized') === td && (s.subDomain || '—') === sd && (s.tribe || '—') === tb) {
          neighbors.push({ id: `squad:${s.key}`, kind: 'squad', label: s.name || s.key });
        }
      }
    } else if (node.kind === 'squad') {
      const key = nodeId.slice(6);
      const s = this.squadsByKey.get(key);
      if (!s) return;
      meta['Tribe'] = s.tribe || '—';
      meta['Sub-domain'] = s.subDomain || '—';
      meta['Tribe domain'] = s.tribeDomain || '—';
      meta['PO'] = s.po || '—';
      for (const a of this.apps) {
        if (a.squad === key) neighbors.push({ id: `app:${a.appId}`, kind: 'app', label: a.appId });
      }
    } else if (node.kind === 'app') {
      const id = nodeId.slice(4);
      const a = this.appsById.get(id);
      if (!a) return;
      meta['Squad'] = a.squad || '—';
      meta['Status'] = a.status || '—';
      const sq = a.squad ? this.squadsByKey.get(a.squad) : undefined;
      if (sq) {
        meta['Tribe'] = sq.tribe || '—';
        meta['Tribe domain'] = sq.tribeDomain || '—';
        if (sq) neighbors.push({ id: `squad:${sq.key}`, kind: 'squad', label: sq.name || sq.key });
      }
    }

    this.selected.set({ kind: node.kind, id: nodeId, label: node.label, meta, neighbors });
    this.applyHighlight(this.search().trim().toLowerCase());
  }

  /** Compute the chain of ancestor + descendant ids for a focused node. */
  private connectedSubgraph(nodeId: string): Set<string> {
    const ids = new Set<string>([nodeId]);
    // Walk descendants via edges.from -> edges.to
    const fwd = (id: string) => {
      for (const e of this.edgesDS.get()) {
        if (e.from === id && !ids.has(e.to)) { ids.add(e.to); fwd(e.to); }
      }
    };
    const bwd = (id: string) => {
      for (const e of this.edgesDS.get()) {
        if (e.to === id && !ids.has(e.from)) { ids.add(e.from); bwd(e.from); }
      }
    };
    fwd(nodeId);
    bwd(nodeId);
    return ids;
  }

  private applyHighlight(q: string) {
    if (!this.network) return;
    const sel = this.selected();
    const focusedIds: Set<string> | null = sel ? this.connectedSubgraph(sel.id) : null;

    const nodeUpdates = this.nodesDS.map((n) => {
      const matchesSearch = !q || n.label.toLowerCase().includes(q);
      const inFocus = !focusedIds || focusedIds.has(n.id);
      return { id: n.id, opacity: (matchesSearch && inFocus) ? 1 : 0.16 } as any;
    });
    this.nodesDS.update(nodeUpdates);

    const edgeUpdates = this.edgesDS.map((e) => {
      const inFocus = !focusedIds || (focusedIds.has(e.from) && focusedIds.has(e.to));
      return { id: e.id, color: { ...(e.color || {}), opacity: inFocus ? 0.9 : 0.07 } } as any;
    });
    this.edgesDS.update(edgeUpdates);
  }

  // ── Tooltip helpers ────────────────────────────────────────────
  private squadTooltip(s: Squad): string {
    return `Squad — ${s.name || s.key}\nTribe: ${s.tribe || '—'}\nSub-domain: ${s.subDomain || '—'}\nTribe domain: ${s.tribeDomain || '—'}\nPO: ${s.po || '—'}`;
  }
  private appTooltip(a: AppInfo): string {
    return `App — ${a.appId}\nSquad: ${a.squad || '—'}\nStatus: ${a.status || '—'}`;
  }

  jumpTo(neighborId: string) {
    if (!this.network) return;
    this.network.selectNodes([neighborId]);
    this.network.focus(neighborId, { scale: 1.1, animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
    this.onNodeSelected(neighborId);
  }
}
