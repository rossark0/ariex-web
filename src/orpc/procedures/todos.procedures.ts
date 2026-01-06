import { z } from 'zod';
import { authenticatedProcedure, baseProcedure } from '../base';

// Todo schema
const TodoSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  completed: z.boolean(),
  userId: z.string(),
  createdAt: z.date(),
});

type Todo = z.infer<typeof TodoSchema>;

// In-memory store (replace with database in production)
const todos: Todo[] = [];

/**
 * List todos for current user
 */
export const listTodos = authenticatedProcedure.handler(async ({ context }) => {
  return todos.filter(todo => todo.userId === context.userId);
});

/**
 * Get single todo by ID
 */
export const getTodo = authenticatedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }) => {
    const todo = todos.find(t => t.id === input.id && t.userId === context.userId);

    if (!todo) {
      throw new Error('Todo not found');
    }

    return todo;
  });

/**
 * Create a new todo
 */
export const createTodo = authenticatedProcedure
  .input(
    z.object({
      title: z.string().min(1, 'Title is required'),
    })
  )
  .handler(async ({ input, context }) => {
    const newTodo: Todo = {
      id: `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: input.title,
      completed: false,
      userId: context.userId,
      createdAt: new Date(),
    };

    todos.push(newTodo);
    return newTodo;
  });

/**
 * Update todo
 */
export const updateTodo = authenticatedProcedure
  .input(
    z.object({
      id: z.string(),
      title: z.string().min(1).optional(),
      completed: z.boolean().optional(),
    })
  )
  .handler(async ({ input, context }) => {
    const todoIndex = todos.findIndex(t => t.id === input.id && t.userId === context.userId);

    if (todoIndex === -1) {
      throw new Error('Todo not found');
    }

    todos[todoIndex] = {
      ...todos[todoIndex],
      ...(input.title && { title: input.title }),
      ...(input.completed !== undefined && { completed: input.completed }),
    };

    return todos[todoIndex];
  });

/**
 * Delete todo
 */
export const deleteTodo = authenticatedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }) => {
    const todoIndex = todos.findIndex(t => t.id === input.id && t.userId === context.userId);

    if (todoIndex === -1) {
      throw new Error('Todo not found');
    }

    todos.splice(todoIndex, 1);
    return { success: true };
  });

/**
 * Toggle todo completion
 */
export const toggleTodo = authenticatedProcedure
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }) => {
    const todoIndex = todos.findIndex(t => t.id === input.id && t.userId === context.userId);

    if (todoIndex === -1) {
      throw new Error('Todo not found');
    }

    todos[todoIndex].completed = !todos[todoIndex].completed;
    return todos[todoIndex];
  });
