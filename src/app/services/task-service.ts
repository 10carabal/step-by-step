import { computed, Service, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Task } from '../models/task.model';

const STORAGE_KEY = 'tasks';
@Service()
export class TaskService {
  private readonly _tasks = signal<Task[]>([]);

  readonly tasks = this._tasks.asReadonly();

  //Filters
  readonly searchTerm = signal<string>('');
  readonly activeCategoryId = signal<string | null>('all');

  //ordered list
  readonly sortedTasks = computed(() =>
    [...this._tasks()].sort((a, b) => a.order - b.order)
  );


  // filtered list based on search term and category
  readonly filteredTasks = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const categoryId = this.activeCategoryId();

    return this.sortedTasks().filter(task => {
      const matchesSearch = !term || task.title.toLowerCase().includes(term);
      const matchesCategory =
        categoryId === 'all' ||
        (categoryId === null && task.categoryId === null) ||
        task.categoryId === categoryId;
      return matchesSearch && matchesCategory;
    });
  });

  readonly totalTasks = computed(() => this._tasks().length);
  readonly completedTasks = computed(() =>
    this._tasks().filter(t => t.completed).length
  );
  readonly pendingTasks = computed(() =>
    this._tasks().filter(t => !t.completed).length
  );

  async initialize(): Promise<void> {
    await this.loadTasks();
  }

  private async loadTasks(): Promise<void> {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (value) {
      this._tasks.set(JSON.parse(value));
    }
  }

  private async persist(): Promise<void> {
    await Preferences.set({
      key: STORAGE_KEY,
      value: JSON.stringify(this._tasks()),
    });
  }

  setSearchTerm(term: string): void {
    this.searchTerm.set(term);
  }

  setActiveCategory(categoryId: string | null): void {
    this.activeCategoryId.set(categoryId);
  }

  async addTask(title: string, categoryId: string | null = null): Promise<void> {
    const currentMaxOrder = this._tasks().reduce(
      (max, t) => Math.max(max, t.order),
      -1
    );
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      completed: false,
      categoryId,
      createdAt: Date.now(),
      order: currentMaxOrder + 1,
    };
    this._tasks.update(tasks => [...tasks, newTask]);
    await this.persist();
  }

  async toggleComplete(id: string): Promise<void> {
    this._tasks.update(tasks =>
      tasks.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
    await this.persist();
  }

  async deleteTask(id: string): Promise<void> {
    this._tasks.update(tasks => tasks.filter(t => t.id !== id));
    await this.persist();
  }

  async updateTaskCategory(id: string, categoryId: string | null): Promise<void> {
    this._tasks.update(tasks =>
      tasks.map(t => (t.id === id ? { ...t, categoryId } : t))
    );
    await this.persist();
  }

  async reorderTasks(reordered: Task[]): Promise<void> {
    const withNewOrder = reordered.map((task, index) => ({ ...task, order: index }));
    this._tasks.update(tasks =>
      tasks.map(t => withNewOrder.find(u => u.id === t.id) ?? t)
    );
    await this.persist();
  }

  async clearCategoryFromTasks(categoryId: string): Promise<void> {
    this._tasks.update(tasks =>
      tasks.map(t => (t.categoryId === categoryId ? { ...t, categoryId: null } : t))
    );
    await this.persist();
  }
}
