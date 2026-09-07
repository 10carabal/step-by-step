import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import {
  AlertController,
  IonButton,
  IonCheckbox,
  IonContent, IonHeader, IonIcon, IonInput, IonItem,
  IonItemOption, IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList, IonListHeader,
  IonReorder,
  IonReorderGroup,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonTitle, IonToolbar, ItemReorderEventDetail,
  SegmentValue
} from '@ionic/angular';
import { Category } from '../models/category.model';
import { Task } from '../models/task.model';
import { CategoryService } from '../services/category-service';
import { RemoteConfigService } from '../services/remote-config-service';
import { TaskService } from '../services/task-service';

interface TaskGroup {
  category: Category | null;
  tasks: Task[];
}


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonItemOption, IonItemOptions, IonReorder, IonCheckbox, IonItemSliding, IonList, IonListHeader, IonReorderGroup, IonLabel, IonSegmentButton, FormField, IonSearchbar, IonSegment, IonIcon, IonInput, IonItem, IonButton, IonHeader, IonToolbar, IonTitle, IonContent],
})
export class HomePage {
  protected readonly taskService = inject(TaskService);
  protected readonly categoryService = inject(CategoryService);
  protected readonly remoteConfigService = inject(RemoteConfigService);

  private readonly alertController = inject(AlertController);

  //--- Signal Forms ---
  protected readonly newTaskModel = signal({ title: '' });
  protected readonly newTaskForm = form(this.newTaskModel, schemaPath => {
    required(schemaPath.title);
  });

  protected readonly newCategoryModel = signal({ name: '' });
  protected readonly newCategoryForm = form(this.newCategoryModel, schemaPath => {
    required(schemaPath.name);
  });

  //plain view drag and drop
  protected readonly flatTasks = this.taskService.filteredTasks;
  //tasks grouped by category
  protected readonly groupedTasks = computed<TaskGroup[]>(() => {
    const tasks = this.taskService.filteredTasks();
    const categories = this.categoryService.categories();

    const groups: TaskGroup[] = categories.map(category => ({
      category,
      tasks: tasks.filter(t => t.categoryId === category.id),
    }));

    const uncategorized = tasks.filter(t => t.categoryId === null);
    if (uncategorized.length > 0) {
      groups.push({ category: null, tasks: uncategorized });
    }

    return groups.filter(g => g.tasks.length > 0);
  });

  async addTask(): Promise<void> {
    if (this.newTaskForm().invalid()) return;

    const title = this.newTaskModel().title.trim();
    if (!title) return;

    const activeCategory = this.taskService.activeCategoryId();
    const categoryId = activeCategory === 'all' ? null : activeCategory;

    await this.taskService.addTask(title, categoryId);
    this.newTaskModel.set({ title: '' });
  }

  async addCategory(): Promise<void> {
    if (this.newCategoryForm().invalid()) return;

    const name = this.newCategoryModel().name.trim();
    if (!name) return;

    await this.categoryService.addCategory(name);
    this.newCategoryModel.set({ name: '' });
  }

  async editCategory(categoryId: string, currentName: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Edit Category',
      inputs: [
        {
          name: 'name',
          type: 'text',
          value: currentName,
          placeholder: 'Category name',
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data: { name: string }) => {
            const newName = data.name?.trim();
            if (!newName) return false;
            await this.categoryService.updateCategory(categoryId, newName);
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  async toggleComplete(id: string): Promise<void> {
    await this.taskService.toggleComplete(id);
  }

  async deleteTask(id: string): Promise<void> {
    await this.taskService.deleteTask(id);
  }

  async deleteCategory(id: string): Promise<void> {
    await this.categoryService.deleteCategory(id);
  }


  onSearchChange(term: string): void {
    this.taskService.setSearchTerm(term);
  }

  onCategoryFilterChange(value: SegmentValue | undefined): void {
    if (value === undefined) return;

    const stringValue = String(value);

    if (stringValue === 'all') {
      this.taskService.setActiveCategory('all');
    } else if (stringValue === 'uncategorized') {
      this.taskService.setActiveCategory(null);
    } else {
      this.taskService.setActiveCategory(stringValue);
    }
  }

  async handleReorder(event: CustomEvent<ItemReorderEventDetail>): Promise<void> {
    const currentOrder = [...this.flatTasks()];
    const movedItem = currentOrder.splice(event.detail.from, 1)[0];
    currentOrder.splice(event.detail.to, 0, movedItem);

    event.detail.complete();

    await this.taskService.reorderTasks(currentOrder);
  }

  getCategoryColor(categoryId: string | null): string {
    return this.categoryService.getCategoryById(categoryId)?.color ?? '#8E8E93';
  }

  trackByCategoryId(index: number, category: Category): string {
    return category.id;
  }

}
