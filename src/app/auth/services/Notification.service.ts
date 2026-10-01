// src/app/core/services/notification.service.ts
import { inject, Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
    providedIn: 'root'
})

export class NotificationService {

  private toastr = inject(ToastrService);

  success(message: string, title: string = 'Succès') {
    this.toastr.success(message, title);
  }

  // successtest(message: string, title: string = 'Succès') {
  //   this.toastr.
  // }

  error(message: string, title: string = 'Erreur') {
    this.toastr.error(message, title);
  }

  warning(message: string, title: string = 'Attention') {
    this.toastr.warning(message, title);
  }

  info(message: string, title: string = 'Info') {
    this.toastr.info(message, title);
  }
}
