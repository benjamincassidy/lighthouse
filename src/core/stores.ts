import { writable, derived, type Readable } from 'svelte/store'

import type { Project } from '@/types/types'

/**
 * Store for all projects
 */
export const projects = writable<Project[]>([])

/**
 * Store for the active project ID
 */
export const activeProjectId = writable<string | undefined>(undefined)

/**
 * Derived store for the active project
 */
export const activeProject: Readable<Project | undefined> = derived(
  [projects, activeProjectId],
  ([$projects, $activeProjectId]) => {
    if (!$activeProjectId) return undefined
    return $projects.find((p) => p.id === $activeProjectId)
  },
)

/**
 * Update the projects store
 */
export function setProjects(newProjects: Project[]): void {
  projects.set(newProjects)
}

/**
 * Update the active project ID
 */
export function setActiveProjectId(id: string | undefined): void {
  activeProjectId.set(id)
}

/**
 * Add or update a project in the store
 */
export function updateProjectInStore(project: Project): void {
  projects.update((current) => {
    const index = current.findIndex((p) => p.id === project.id)
    if (index >= 0) {
      current[index] = project
    } else {
      current.push(project)
    }
    return current
  })
}

/**
 * Remove a project from the store
 */
export function removeProjectFromStore(id: string): void {
  projects.update((current) => current.filter((p) => p.id !== id))
}
