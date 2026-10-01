import { Injectable } from '@angular/core';
import {
  FileValidationOptions,
  FileValidationResult
} from 'src/app/interfaces/FileValidation';

@Injectable({
  providedIn: 'root'
})
export class FileValidationService {
  maxFileSize!: number;
  private isInitialized: boolean = false;

  // Types MIME autorisés
  private readonly imageMimes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml',
    'image/tiff',
    'image/x-icon',
    'image/avif'
  ];

  private readonly fileMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/zip',
    'application/x-rar-compressed',
    'text/plain',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

  // Extensions correspondantes pour une validation supplémentaire
  private readonly imageExtensions = [
    'jpeg',
    'jpg',
    'png',
    'gif',
    'webp',
    'bmp',
    'svg',
    'tiff',
    'ico',
    'avif'
  ];
  private readonly fileExtensions = [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'csv',
    'zip',
    'rar',
    'txt',
    'ppt',
    'pptx'
  ];

  constructor() {
    this.initializeMaxFileSize();
  }

  /**
   * Initialise la taille maximale depuis les paramètres de l'application
   */
  private initializeMaxFileSize(): void {
    // this.settingService.getDataApplicationSetting().subscribe({
    //   next: (response) => {
    //     this.maxFileSize = Number(response.data['image_size']) || 2097152;
    //   },
    //   error: (error) => {
    //     console.warn('Impossible de récupérer image_size, utilisation de la valeur par défaut (2 Mo)', error);
    //     this.isInitialized = true;
    //   }
    // });
  }

  /**
   * Définit manuellement la taille maximale des fichiers
   * @param sizeInMb Taille en Mo
   */
  setMaxFileSize(sizeInMb: number): void {
    this.maxFileSize = sizeInMb;
  }

  /**
   * Obtient la taille maximale en Mo
   * @returns Taille en Mo
   */
  getMaxFileSize(): number {
    return this.maxFileSize;
  }

  /**
   * Obtient la taille maximale en octets
   * @returns Taille en octets
   */
  getMaxFileSizeInBytes(): number {
    return this.maxFileSize * 1024 * 1024;
  }

  /**
   * Vérifie si le service est initialisé
   * @returns true si initialisé
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Valide un fichier selon les critères spécifiés
   * @param file Le fichier à valider
   * @param options Options de validation
   * @returns Résultat de la validation
   */
  validateFile(
    file: File | null,
    options: FileValidationOptions = {}
  ): FileValidationResult {
    const errors: string[] = [];
    const type = options.type || 'any';
    const maxSize = options.maxFileSize || this.maxFileSize;

    // Vérifier si le fichier existe
    if (!file) {
      errors.push('Le fichier est obligatoire.');
      return { valid: false, errors };
    }

    // Valider la taille
    if (file.size > maxSize * 1024 * 1024) {
      errors.push(`La taille du fichier ne doit pas dépasser ${maxSize} Mo.`);
    }

    // Valider le type MIME et l'extension
    const fileExtension = this.getFileExtension(file.name);

    switch (type) {
      case 'image':
        if (
          !this.imageMimes.includes(file.type) ||
          !this.imageExtensions.includes(fileExtension)
        ) {
          errors.push(
            `Le fichier doit être une image valide (${this.imageExtensions.join(
              ', '
            )}).`
          );
        }
        break;

      case 'file':
        if (
          !this.fileMimes.includes(file.type) ||
          !this.fileExtensions.includes(fileExtension)
        ) {
          errors.push(
            `Le fichier doit être de type : ${this.fileExtensions.join(', ')}.`
          );
        }
        break;

      case 'any':
        // Pas de validation de type MIME pour 'any'
        break;
    }

    // Appliquer les règles personnalisées
    if (options.customRules) {
      options.customRules.forEach((rule) => {
        if (!rule.validate(file)) {
          errors.push(rule.message);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Valide plusieurs fichiers
   * @param files Liste de fichiers à valider
   * @param options Options de validation
   * @returns Résultat de la validation pour chaque fichier
   */
  validateFiles(
    files: File[],
    options: FileValidationOptions = {}
  ): FileValidationResult[] {
    return files.map((file) => this.validateFile(file, options));
  }

  /**
   * Vérifie si tous les fichiers sont valides
   * @param files Liste de fichiers à valider
   * @param options Options de validation
   * @returns true si tous les fichiers sont valides
   */
  areAllFilesValid(
    files: File[],
    options: FileValidationOptions = {}
  ): boolean {
    const results = this.validateFiles(files, options);
    return results.every((result) => result.valid);
  }

  /**
   * Récupère toutes les erreurs de validation pour plusieurs fichiers
   * @param files Liste de fichiers à valider
   * @param options Options de validation
   * @returns Tableau de toutes les erreurs
   */
  getAllErrors(files: File[], options: FileValidationOptions = {}): string[] {
    const results = this.validateFiles(files, options);
    return results.flatMap((result) => result.errors);
  }

  /**
   * Extrait l'extension d'un nom de fichier
   * @param filename Nom du fichier
   * @returns Extension en minuscules
   */
  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Convertit un fichier en Base64 (utile pour l'envoi au backend)
   * @param file Le fichier à convertir
   * @returns Promise avec la chaîne Base64
   */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }

  /**
   * Crée un FormData pour l'upload
   * @param file Le fichier à ajouter
   * @param fieldName Nom du champ (par défaut 'file')
   * @returns FormData prêt pour l'envoi
   */
  createFormData(file: File, fieldName: string = 'file'): FormData {
    const formData = new FormData();
    formData.append(fieldName, file, file.name);
    return formData;
  }
}
