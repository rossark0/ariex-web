import type { GenericItem } from '../GenericStore'
import { genericItemsMock } from '../data/generic-mocks'

export const dynamic = 'force-dynamic'

// Server action examples. Replace with real API calls.
export async function fetchGenericItems(): Promise<GenericItem[]> {
    'use server'
    await new Promise((r) => setTimeout(r, 200))
    return genericItemsMock
}

export async function createGenericItem(input: Pick<GenericItem, 'title'>): Promise<GenericItem> {
    'use server'
    return { id: crypto.randomUUID(), title: input.title, createdAt: new Date().toISOString() }
}
