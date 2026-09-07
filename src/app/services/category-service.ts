import { computed, inject, Service, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Category } from '../models/category.model';
import { TaskService } from './task-service';

const STORAGE_KEY = 'categories';

export const CATEGORY_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA94D',
  '#A78BFA', '#63C462', '#F783AC', '#748FFC',
];
@Service()
export class CategoryService {
  private readonly taskService = inject(TaskService);

  private readonly _categories = signal<Category[]>([]);
  readonly categories = this._categories.asReadonly();

  readonly totalCategories = computed(() => this._categories().length);
  CATEGORY_COLORS: any;


  async initialize(): Promise<void> {
    await this.loadCategories();
  }
  private async loadCategories(): Promise<void> {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (value) {
      this._categories.set(JSON.parse(value));
    }
  }

  private async persist(): Promise<void> {
    await Preferences.set({
      key: STORAGE_KEY,
      value: JSON.stringify(this._categories()),
    });
  }

  private nextColor(): string {
    const usedCount = this._categories().length;
    return this.CATEGORY_COLORS[usedCount % this.CATEGORY_COLORS.length];
  }

  async addCategory(name: string): Promise<void> {
    const newCategory: Category = {
      id: crypto.randomUUID(),
      name: name.trim(),
      color: this.nextColor(),
      createdAt: Date.now(),
    };
    this._categories.update(categories => [...categories, newCategory]);
    await this.persist();
  }

  async updateCategory(id: string, name: string): Promise<void> {
    this._categories.update(categories =>
      categories.map(c => (c.id === id ? { ...c, name: name.trim() } : c))
    );
    await this.persist();
  }

  async deleteCategory(id: string): Promise<void> {
    this._categories.update(categories => categories.filter(c => c.id !== id));
    await this.persist();
    await this.taskService.clearCategoryFromTasks(id);
  }

  getCategoryById(id: string | null): Category | undefined {
    if (!id) return undefined;
    return this._categories().find(c => c.id === id);
  }
}
