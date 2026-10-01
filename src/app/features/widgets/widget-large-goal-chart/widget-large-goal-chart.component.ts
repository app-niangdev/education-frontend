import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WidgetChartComponent } from '../widget-chart/widget-chart.component';

@Component({
  selector: 'vex-widget-large-goal-chart',
  templateUrl: './widget-large-goal-chart.component.html',
  standalone: true,
  imports: [CommonModule, WidgetChartComponent]
})
export class WidgetLargeGoalChartComponent {}
