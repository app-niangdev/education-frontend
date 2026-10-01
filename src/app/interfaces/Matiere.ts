export interface Matiere {
  id: number;
  nom: string;
  code: string;
  description: string | null;
}

export type MatierePayload = Omit<Matiere, 'id'>;
