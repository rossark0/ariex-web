"use client"

import { useEffect } from 'react'
import { useGeneric, selectItems, selectIsLoading } from '../GenericStore'
import { fetchGenericItems } from '../services/generic.service'

export function GenericExample() {
	const items = useGeneric(selectItems)
	const isLoading = useGeneric(selectIsLoading)
	const { setItems, startLoading, stopLoading } = useGeneric((s) => ({
		setItems: s.setItems,
		startLoading: s.startLoading,
		stopLoading: s.stopLoading,
	}))

	useEffect(() => {
		let mounted = true
		async function run() {
			startLoading()
			const data = await fetchGenericItems()
			if (mounted) setItems(data)
			stopLoading()
		}
		run()
		return () => { mounted = false }
	}, [setItems, startLoading, stopLoading])

	return (
		<div className="flex flex-col gap-2">
			<div className="text-sm text-muted-foreground">Generic Example (Zustand only)</div>
			{isLoading ? (
				<div>Loading…</div>
			) : (
				<ul className="flex flex-col gap-1">
					{items.map((it) => (
						<li key={it.id} className="flex items-center justify-between">
							<span>{it.title}</span>
							<span className="text-xs text-muted-foreground">{new Date(it.createdAt).toLocaleString()}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}


