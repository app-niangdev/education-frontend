export type TypePeriode = 'TRIMESTRE' | 'SEMESTRE' | 'BIMESTRE' | 'QUADRIMESTRE';

export interface Periode {
  id: number;
  libelle: string;
  type: TypePeriode;
  ordre: number;
  date_debut: string;
  date_fin: string;
  date_fin_saisie_notes: string;
  annee_scolaire_id: number;
}
