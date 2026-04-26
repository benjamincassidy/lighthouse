import { Notice, TFile, type App, type Editor } from 'obsidian'

import type { ProjectManager } from '@/core/ProjectManager'

/**
 * Handles file split and merge operations for the active project.
 */
export class FileSplitter {
  constructor(
    private app: App,
    private projectManager: ProjectManager,
  ) {}

  /**
   * Split the active file at the editor cursor position.
   *
   * - Content before the cursor stays in the original file.
   * - Content from the cursor onward moves into a newly created sibling file.
   * - The new file is inserted into the project's fileOrder immediately after
   *   the original.
   */
  async splitAtCursor(editor: Editor, sourceFile: TFile): Promise<void> {
    const cursor = editor.getCursor()
    const content = editor.getValue()
    const lines = content.split('\n')

    const before = lines.slice(0, cursor.line).join('\n')
    const after = lines.slice(cursor.line).join('\n').trim()

    if (!after) {
      new Notice('Nothing after the cursor to split into a new note.')
      return
    }

    // Generate a unique sibling file name
    const folder = sourceFile.parent?.path ?? ''
    const baseName = sourceFile.basename
    const newPath = this.uniqueSiblingPath(folder, baseName)

    // Write split content
    editor.setValue(before)
    const newFile = await this.app.vault.create(newPath, after)

    // Update fileOrder: insert newPath directly after sourceFile.path
    const project = this.projectManager.getActiveProject()
    if (project) {
      const order = project.fileOrder ? [...project.fileOrder] : []
      const srcIdx = order.indexOf(sourceFile.path)
      if (srcIdx !== -1) {
        order.splice(srcIdx + 1, 0, newPath)
      } else {
        // Source wasn't in order yet; append new file after source at end
        order.push(sourceFile.path, newPath)
      }
      await this.projectManager.reorderProjectFiles(project.id, order)
    }

    // Open the new file
    const leaf = this.app.workspace.getLeaf(false)
    await leaf.openFile(newFile)

    new Notice(`Split into "${newFile.name}"`)
  }

  /**
   * Merge sourceFile into targetFile.
   *
   * - Appends a separator and the source content to the target file.
   * - Deletes the source file from the vault.
   * - Removes the source file from the project's fileOrder.
   */
  async mergeInto(sourceFile: TFile, targetFile: TFile): Promise<void> {
    if (sourceFile.path === targetFile.path) {
      new Notice('Cannot merge a file into itself.')
      return
    }

    const sourceContent = await this.app.vault.read(sourceFile)
    const targetContent = await this.app.vault.read(targetFile)

    const separator = '\n\n---\n\n'
    const merged = targetContent.trimEnd() + separator + sourceContent.trim()

    await this.app.vault.modify(targetFile, merged)
    await this.app.fileManager.trashFile(sourceFile)

    // Remove source from fileOrder
    const project = this.projectManager.getActiveProject()
    if (project?.fileOrder) {
      const newOrder = project.fileOrder.filter((p) => p !== sourceFile.path)
      await this.projectManager.reorderProjectFiles(project.id, newOrder)
    }

    // If the source file is open, open the target instead
    const leaves = this.app.workspace.getLeavesOfType('markdown')
    for (const leaf of leaves) {
      const view = leaf.view as { file?: TFile }
      if (view.file?.path === sourceFile.path) {
        await leaf.openFile(targetFile)
        break
      }
    }

    new Notice(`Merged "${sourceFile.name}" into "${targetFile.name}"`)
  }

  /**
   * Collect all markdown files belonging to the active project.
   * Used to populate the merge target picker.
   */
  getProjectFiles(): TFile[] {
    const project = this.projectManager.getActiveProject()
    if (!project) return []

    const allFolders = [...project.contentFolders, ...project.sourceFolders].map((rel) =>
      rel ? `${project.rootPath}/${rel}` : project.rootPath,
    )

    const files: TFile[] = []
    for (const folderPath of allFolders) {
      const folder = this.app.vault.getAbstractFileByPath(folderPath)
      if (folder && 'children' in folder) {
        this.collectMarkdownFiles(folder as Parameters<typeof this.collectMarkdownFiles>[0], files)
      }
    }
    return files
  }

  private collectMarkdownFiles(folder: { children: unknown[] }, out: TFile[]): void {
    for (const child of folder.children) {
      if (child !== null && typeof child === 'object' && 'children' in child) {
        this.collectMarkdownFiles(child as { children: unknown[] }, out)
      } else if (child instanceof TFile && child.extension === 'md') {
        out.push(child)
      }
    }
  }

  /** Return a path that doesn't yet exist in the vault. */
  private uniqueSiblingPath(folder: string, baseName: string): string {
    const prefix = folder ? `${folder}/` : ''
    let candidate = `${prefix}${baseName} 2.md`
    let n = 2
    while (this.app.vault.getAbstractFileByPath(candidate)) {
      n++
      candidate = `${prefix}${baseName} ${n}.md`
    }
    return candidate
  }
}
