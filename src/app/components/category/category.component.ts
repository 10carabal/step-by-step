import { Component, inject, signal } from '@angular/core';
import { AlertController, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonLabel, IonList, IonTitle, IonToolbar, ModalController } from "@ionic/angular";
import { CategoryService } from '../../services/category-service';

@Component({
  selector: 'app-category',
  imports: [IonInput, IonItemOption, IonButtons, IonTitle, IonToolbar, IonContent, IonItem, IonButton, IonItemSliding, IonLabel, IonIcon, IonHeader, IonItemOptions, IonList],
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.css'],
})
export class CategoryComponent {
  [x: string]: any;

  protected readonly categoryService = inject(CategoryService);
  private readonly modalController = inject(ModalController);
  private readonly alertController = inject(AlertController);

  protected readonly newCategoryName = signal('');


  /* protected readonly newCategoryModel = signal({ name: '' });
  protected readonly newCategoryForm = form(this.newCategoryModel, schemaPath => {
    required(schemaPath.name);
  });
 */
  async addCategory(): Promise<void> {
    const name = this.newCategoryName().trim();
    if (!name) return;

    await this.categoryService.addCategory(name);
    this.newCategoryName.set('');
  }
  async editCategory(id: string, currentName: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Edit Category',
      inputs: [{ name: 'name', type: 'text', value: currentName }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data: { name: string }) => {
            const newName = data.name?.trim();
            if (!newName) return false;
            await this.categoryService.updateCategory(id, newName);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async confirmDelete(id: string, name: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Delete Category',
      message: `Delete "${name}"? Tasks in this category will become uncategorized.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => this.categoryService.deleteCategory(id),
        },
      ],
    });
    await alert.present();
  }

  dismiss(): void {
    this.modalController.dismiss();
  }
}
