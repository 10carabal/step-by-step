import { ScrollingModule } from '@angular/cdk/scrolling';
import { Component, computed, inject, signal } from '@angular/core';
import {
  ActionSheetController,
  AlertController,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonChip,
  IonContent, IonHeader, IonIcon, IonInput, IonItem,
  IonItemOption, IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList, IonListHeader,
  IonReorder,
  IonReorderGroup,
  IonSearchbar,
  IonSelect, IonSelectOption,
  IonTitle, IonToolbar, ItemReorderEventDetail,
  ModalController
} from '@ionic/angular';
import { CategoryComponent } from '../components/category/category.component';
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
  imports: [IonChip, IonButtons, IonItemOption, IonItemOptions, IonReorder, IonCheckbox, IonItemSliding, IonList, IonListHeader, IonReorderGroup, IonLabel, IonSelect, IonSelectOption, IonSearchbar, IonIcon, IonInput, IonItem, IonButton, IonHeader, IonToolbar, IonTitle, IonContent, ScrollingModule],
})
export class HomePage {
  protected readonly taskService = inject(TaskService);
  protected readonly categoryService = inject(CategoryService);
  protected readonly remoteConfigService = inject(RemoteConfigService);

  private readonly alertController = inject(AlertController);
  private readonly modalController = inject(ModalController);
  private readonly actionSheetController = inject(ActionSheetController);

  protected readonly newTaskTitle = signal('');

  //--- Signal Forms ---
  /* protected readonly newTaskModel = signal({ title: '' });
  protected readonly newTaskForm = form(this.newTaskModel, schemaPath => {
    required(schemaPath.title);
  });

  protected readonly newCategoryModel = signal({ name: '' });
  protected readonly newCategoryForm = form(this.newCategoryModel, schemaPath => {
    required(schemaPath.name);
  });
 */

  protected readonly useVirtualScroll = computed(() => this.flatTasks().length > 50);

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

  async openCategoryManager(): Promise<void> {
    const modal = await this.modalController.create({
      component: CategoryComponent,
    });
    await modal.present();
  }

  async assignCategory(taskId: string): Promise<void> {
    const buttons = [
      ...this.categoryService.categories().map(category => ({
        text: category.name,
        handler: () => this.taskService.updateTaskCategory(taskId, category.id),
      })),
      {
        text: 'Uncategorized',
        handler: () => this.taskService.updateTaskCategory(taskId, null),
      },
      { text: 'Cancel', role: 'cancel' as const },
    ];

    const actionSheet = await this.actionSheetController.create({
      header: 'Assign category',
      buttons,
    });
    await actionSheet.present();
  }

  async addTask(): Promise<void> {
    const title = this.newTaskTitle().trim();
    if (!title) return;

    const activeCategory = this.taskService.activeCategoryId();
    const categoryId = activeCategory === 'all' ? null : activeCategory;

    await this.taskService.addTask(title, categoryId);
    this.newTaskTitle.set('');
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

  onCategoryFilterChange(value: string | number | undefined): void {
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

  getCategoryName(categoryId: string | null): string {
    return this.categoryService.getCategoryById(categoryId)?.name ?? 'Uncategorized';
  }

  trackByCategoryId(index: number, category: Category): string {
    return category.id;
  }

  trackByTaskId(index: number, task: Task): string {
    return task.id;
  }

}
