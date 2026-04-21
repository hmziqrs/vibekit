import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { uuid } from '$lib/server/uuid';

export const task = sqliteTable('task', {
	id: text('id').primaryKey().$defaultFn(() => uuid()),
	title: text('title').notNull(),
	priority: integer('priority').notNull().default(1)
});

export * from './auth.schema';
