import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing.module';
import { CompanyStoreAddComponent } from './company/company-store-add/company-store-add.component';


@NgModule({
  declarations: [
    CompanyStoreAddComponent
  ],
  imports: [
    CommonModule,
    AdminRoutingModule
  ]
})
export class AdminModule { }
