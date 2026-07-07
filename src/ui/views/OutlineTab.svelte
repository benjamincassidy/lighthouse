<script lang="ts">
  import { MarkdownView, type HeadingCache, type TFile } from 'obsidian'
  import { onMount } from 'svelte'

  import type LighthousePlugin from '@/main'


  interface Props {
    plugin: LighthousePlugin
  }

  let { plugin }: Props = $props()

  let currentFile = $state<TFile | null>(null)
  let headings = $state<HeadingCache[]>([])

  function updateOutline() {
    const file = plugin.app.workspace.getActiveFile()
    if (!file || file.extension !== 'md') {
      currentFile = null
      headings = []
      return
    }
    currentFile = file
    headings = plugin.app.metadataCache.getFileCache(file)?.headings ?? []
  }

  onMount(() => {
    updateOutline()

    plugin.registerEvent(plugin.app.workspace.on('active-leaf-change', updateOutline))
    plugin.registerEvent(plugin.app.workspace.on('file-open', updateOutline))
    plugin.registerEvent(
      plugin.app.metadataCache.on('changed', (file) => {
        if (currentFile && file.path === currentFile.path) updateOutline()
      }),
    )
  })

  function jumpToHeading(heading: HeadingCache) {
    const view = plugin.app.workspace.getActiveViewOfType(MarkdownView)
    if (!view) return
    const pos = { line: heading.position.start.line, ch: 0 }
    view.editor.setCursor(pos)
    view.editor.scrollIntoView({ from: pos, to: pos }, true)
  }
</script>

<div class="lh-outline">
  {#if !currentFile}
    <div class="pane-empty">
      No active file<br />
      <span class="pane-empty-message">Open a file to see its outline</span>
    </div>
  {:else if headings.length === 0}
    <div class="pane-empty">No headings in this file</div>
  {:else}
    <div class="lh-outline-list">
      {#each headings as heading, i (i)}
        <button
          class="lh-outline-item"
          style="padding-left: {(heading.level - 1) * 12 + 10}px"
          onclick={() => jumpToHeading(heading)}
        >
          {heading.heading}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .lh-outline {
    height: 100%;
    overflow-y: auto;
    padding: 6px 0;
  }

  .lh-outline-list {
    display: flex;
    flex-direction: column;
  }

  .lh-outline-item {
    display: block;
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    box-shadow: none;
    padding-top: 5px;
    padding-bottom: 5px;
    padding-right: 10px;
    font-size: var(--font-ui-small);
    color: var(--text-muted);
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lh-outline-item:hover {
    background: var(--background-modifier-hover);
    color: var(--text-normal);
  }
</style>
