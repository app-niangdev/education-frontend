export interface FileValidationResult {
  valid: boolean;
  errors: string[];
}

export interface FileValidationOptions {
  type?: 'image' | 'file' | 'any';
  customRules?: ValidationRule[];
  maxFileSize?: number; // en Mo
}

export interface ValidationRule {
  validate: (file: File) => boolean;
  message: string;
}
