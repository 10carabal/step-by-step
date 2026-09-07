import { addIcons } from 'ionicons';
import {
  addCircle,
  checkmarkDoneCircleOutline,
  folderOutline,
  pencil,
  pricetag,
  trash,
} from 'ionicons/icons';

export function registerAppIcons(): void {
  addIcons({
    'add-circle': addCircle,
    pencil,
    pricetag,
    trash,
    'checkmark-done-circle-outline': checkmarkDoneCircleOutline,
    'folder-outline': folderOutline,
  });
}
