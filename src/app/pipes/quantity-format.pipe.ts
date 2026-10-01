import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'quantityFormat',
  standalone: true
})
export class QuantityFormatPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined) {
      return '0';
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
      return '0';
    }

    // Vérifier si le nombre a des décimales significatives
    if (numValue % 1 === 0) {
      // Pas de décimales, afficher comme entier
      return numValue.toFixed(0);
    } else {
      // A des décimales, afficher avec les décimales
      return numValue.toString();
    }
  }
}
