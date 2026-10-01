import { Component, inject, Output, EventEmitter, ViewChild, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { scaleIn400ms } from '@vex/animations/scale-in.animation';
import { fadeInRight400ms } from '@vex/animations/fade-in-right.animation';
import { FileValidationService } from 'src/app/auth/services/FileValidation.service';

@Component({
  selector: 'vex-upload-file',
  templateUrl: './upload-file.component.html',
  styleUrls: ['./upload-file.component.scss'],
  animations: [scaleIn400ms, fadeInRight400ms],
  standalone: true,
  imports: [CommonModule]
})
export class UploadFileComponent implements OnChanges {
  @Input() defaultImageUrl: string | null = null;
  @Input() defaultImageName: string = 'Image actuelle';
  @Output() fileUploaded = new EventEmitter<File>();
  @Output() fileRemoved = new EventEmitter<void>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private fileValidationService = inject(FileValidationService);

  selectedFile: File | null = null;
  previewUrl: string | null = null;
  validationErrors: string[] = [];
  isDragging = false;
  isLoading = false;
  hasDefaultImage = false;

  get maxFileSize(): number {
    return this.fileValidationService.getMaxFileSize();
  }

  get acceptedFormats(): string {
    return '.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.tiff,.ico,.avif';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['defaultImageUrl'] && this.defaultImageUrl && !this.selectedFile) {
      this.hasDefaultImage = true;
      this.previewUrl = this.defaultImageUrl;
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0] || null;
    this.handleFileSelection(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  onZoneClick(event: MouseEvent): void {
    // Toujours ouvrir le sélecteur de fichiers quand on clique sur la zone
    // (sauf si on clique sur le bouton Supprimer qui a déjà stopPropagation)
    this.fileInput.nativeElement.click();
  }

  private handleFileSelection(file: File | null): void {
    this.resetState();

    if (!file) {
      return;
    }

    const validationResult = this.fileValidationService.validateFile(file, { type: 'image' });

    if (!validationResult.valid) {
      this.validationErrors = validationResult.errors;
      return;
    }

    this.selectedFile = file;
    this.hasDefaultImage = false;
    this.generatePreview(file);
    this.fileUploaded.emit(file);
  }

  private generatePreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.previewUrl = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  removeFile(): void {
    if (this.selectedFile && this.defaultImageUrl) {
      this.selectedFile = null;
      this.hasDefaultImage = true;
      this.previewUrl = this.defaultImageUrl;
    } else {
      this.resetState();
    }
    this.fileRemoved.emit();
  }

  private resetState(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    this.hasDefaultImage = false;
    this.validationErrors = [];
  }

  getFileSizeInMB(sizeInBytes: number): string {
    return (sizeInBytes / (1024 * 1024)).toFixed(2);
  }

  getDisplayName(): string {
    if (this.selectedFile) {
      return this.selectedFile.name;
    } else if (this.hasDefaultImage) {
      return this.defaultImageName;
    }
    return '';
  }

  isDefaultImage(): boolean {
    return this.hasDefaultImage && !this.selectedFile;
  }
}
