<script lang="ts">
  import type { InspectorTab } from '@/core/WorkspaceManager'
  import type LighthousePlugin from '@/main'
  import OutlineTab from '@/ui/views/OutlineTab.svelte'
  import OverviewTab from '@/ui/views/OverviewTab.svelte'
  import StatsTab from '@/ui/views/StatsTab.svelte'

  interface Props {
    plugin: LighthousePlugin
  }

  let { plugin }: Props = $props()

  let activeTab = $derived(plugin.workspaceManager.getLastInspectorTab())

  function selectTab(tab: InspectorTab) {
    activeTab = tab
    void plugin.workspaceManager.setLastInspectorTab(tab)
  }
</script>

<div class="lh-inspector">
  <div class="lh-inspector-tabs" role="tablist">
    <button
      class="lh-icon-tab"
      class:lh-icon-tab-active={activeTab === 'overview'}
      role="tab"
      aria-selected={activeTab === 'overview'}
      aria-label="Overview"
      title="Overview"
      onclick={() => selectTab('overview')}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    </button>
    <button
      class="lh-icon-tab"
      class:lh-icon-tab-active={activeTab === 'stats'}
      role="tab"
      aria-selected={activeTab === 'stats'}
      aria-label="Stats"
      title="Stats"
      onclick={() => selectTab('stats')}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    </button>
    <button
      class="lh-icon-tab"
      class:lh-icon-tab-active={activeTab === 'outline'}
      role="tab"
      aria-selected={activeTab === 'outline'}
      aria-label="Outline"
      title="Outline"
      onclick={() => selectTab('outline')}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    </button>
  </div>
  <div class="lh-inspector-content">
    {#if activeTab === 'overview'}
      <OverviewTab {plugin} />
    {:else if activeTab === 'stats'}
      <StatsTab {plugin} />
    {:else}
      <OutlineTab {plugin} />
    {/if}
  </div>
</div>

<style>
  .lh-inspector {
    height: 100%;
    display: flex;
    flex-direction: column;
    /* Redeclare Lighthouse design tokens here so an Obsidian theme cannot
       shadow them via an ancestor :root or .theme-dark rule. Sourced from
       the user's own Obsidian accent color so it matches their theme. */
    --lh-accent: var(--interactive-accent);
    --lh-accent-hover: var(--interactive-accent-hover);
    --lh-accent-subtle: color-mix(in srgb, var(--interactive-accent) 12%, transparent);
    --lh-ring-transition: stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .lh-inspector-tabs {
    display: flex;
    gap: 2px;
    padding: 8px 10px 6px;
    border-bottom: 1px solid var(--background-modifier-border);
    flex-shrink: 0;
  }

  .lh-inspector-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .lh-icon-tab {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    padding: 6px 0;
    background: transparent;
    border: none;
    border-radius: var(--radius-s);
    cursor: pointer;
    color: var(--text-faint);
    transition: background 0.1s;
  }

  .lh-icon-tab-active {
    background: var(--lh-accent-subtle);
    color: var(--lh-accent);
  }

  .lh-icon-tab:not(.lh-icon-tab-active):hover {
    background: var(--background-modifier-hover);
    color: var(--text-normal);
  }
</style>
