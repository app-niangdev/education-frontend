import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'integerSeparator',
  standalone: true
})
export class IntegerSeparatorPipe implements PipeTransform {
  transform(value: number | string): string {
    if (value === null || value === undefined) {
      return '';
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
      return '';
    }

    // Format with space as thousand separator
    return numValue.toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).replace(/\s/g, ' ');
  }
}
