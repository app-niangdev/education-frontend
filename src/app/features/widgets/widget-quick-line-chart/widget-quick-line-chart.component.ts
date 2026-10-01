import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'vex-widget-quick-line-chart',
  templateUrl: './widget-quick-line-chart.component.html',
  standalone: true,
  imports: [CommonModule, MatIconModule]
})
export class WidgetQuickLineChartComponent {
  @Input({ required: true }) icon!: string;
  @Input({ required: true }) value!: string;
  @Input({ required: true }) label!: string;
  @Input() iconClass?: string;

  constructor(private route: Router) {}

  openSheet(redirect: string) {
    if (redirect === 'customer') {
      this.route.navigate(['index/manager/customers/list']);
    }
    if (redirect === 'supplier') {
      this.route.navigate(['index/manager/suppliers/list']);
    }
  }
}
