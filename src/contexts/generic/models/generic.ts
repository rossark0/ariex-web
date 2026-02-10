/* eslint-disable camelcase */
import { z } from 'zod'
import { create_generic_item_errors } from '../data/generic-validation'

export const genericItemSchema = z.object({
	id: z.string().optional(),
	title: z.string({ error: create_generic_item_errors.title }),
	createdAt: z.string().optional(),
})

export type GenericModel = z.infer<typeof genericItemSchema>


