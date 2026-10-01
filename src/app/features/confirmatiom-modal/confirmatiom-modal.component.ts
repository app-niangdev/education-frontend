import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Colore l'action principale en rouge pour les operations destructives. */
  destructive?: boolean;
}

@Component({
  selector: 'vex-confirmatiom-modal',
  templateUrl: './confirmatiom-modal.component.html',
  styleUrls: ['./confirmatiom-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule]
})
export class ConfirmatiomModalComponent {
  private readonly dialogRef =
    inject<MatDialogRef<ConfirmatiomModalComponent, boolean>>(MatDialogRef);

  constructor(@Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData) {}

  get confirmLabel(): string {
    return this.data.confirmLabel ?? 'Confirmer';
  }

  get cancelLabel(): string {
    return this.data.cancelLabel ?? 'Annuler';
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
