import { createStore, type StoreApi } from 'zustand/vanilla'
import { useSyncExternalStore } from 'react'

export type GenericItem = {
	id: string
	title: string
	createdAt: string
}

export type GenericState = {
	items: GenericItem[]
	isLoading: boolean
	error: string | null
	addItem: (item: GenericItem) => void
	updateItem: (id: string, updates: Partial<Omit<GenericItem, 'id'>>) => void
	removeItem: (id: string) => void
	setItems: (items: GenericItem[]) => void
	startLoading: () => void
	stopLoading: () => void
	setError: (message: string | null) => void
	reset: () => void
}

export function createGenericStore(overrides?: Partial<GenericState>): StoreApi<GenericState> {
	const initial: Omit<
		GenericState,
		| 'addItem'
		| 'updateItem'
		| 'removeItem'
		| 'setItems'
		| 'startLoading'
		| 'stopLoading'
		| 'setError'
		| 'reset'
	> = {
		items: [],
		isLoading: false,
		error: null,
	}

	return createStore<GenericState>()((set, get) => ({
		...initial,
		...overrides,
		addItem: (item) => set((state) => ({ items: [item, ...state.items] })),
		updateItem: (id, updates) =>
			set((state) => ({
				items: state.items.map((it) => (it.id === id ? { ...it, ...updates } : it)),
			})),
		removeItem: (id) => set((state) => ({ items: state.items.filter((it) => it.id !== id) })),
		setItems: (items) => set({ items }),
		startLoading: () => set({ isLoading: true, error: null }),
		stopLoading: () => set({ isLoading: false }),
		setError: (message) => set({ error: message, isLoading: false }),
		reset: () => set({ items: [], isLoading: false, error: null }),
	}))
}

export type GenericStore = StoreApi<GenericState>

let storeInstance: GenericStore | null = null
export function getGenericStore(): GenericStore {
	if (!storeInstance) storeInstance = createGenericStore()
	return storeInstance
}

export function useGeneric<T>(selector: (state: GenericState) => T): T {
	const s = getGenericStore()
	return useSyncExternalStore(
		s.subscribe,
		() => selector(s.getState()),
		() => selector(s.getState())
	)
}

// Selectors (co-located with the store per convention)
export const selectItems = (s: GenericState) => s.items
export const selectIsLoading = (s: GenericState) => s.isLoading
export const selectError = (s: GenericState) => s.error


