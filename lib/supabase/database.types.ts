// Hand-authored to match supabase/migrations/*.sql. Regenerate from the real
// database once linked to a Supabase project:
//   npm run db:types
// (requires `supabase link` — see README.md).

import type { CertificateBodyBlock, CertificateData, CertificateField, CertificateStatus } from '@/lib/certificates/types';

export type { CertificateStatus };
export type UserRole = 'vet' | 'editor' | 'admin';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          role: UserRole;
          designation: string;
          registration_no: string | null;
          institution: string | null;
          mandal: string | null;
          district: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          designation?: string;
          registration_no?: string | null;
          institution?: string | null;
          mandal?: string | null;
          district?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          designation?: string;
          registration_no?: string | null;
          institution?: string | null;
          mandal?: string | null;
          district?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      certificate_templates: {
        Row: {
          id: string;
          key: string;
          name: string;
          title_en: string;
          title_te: string;
          number_prefix: string;
          fields: CertificateField[];
          body: CertificateBodyBlock[];
          published: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          title_en: string;
          title_te?: string;
          number_prefix: string;
          fields?: CertificateField[];
          body?: CertificateBodyBlock[];
          published?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          name?: string;
          title_en?: string;
          title_te?: string;
          number_prefix?: string;
          fields?: CertificateField[];
          body?: CertificateBodyBlock[];
          published?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      certificates: {
        Row: {
          id: string;
          template_id: string;
          data: CertificateData;
          number: string | null;
          status: CertificateStatus;
          cancelled_reason: string | null;
          cancelled_at: string | null;
          created_by: string;
          issued_by: string | null;
          issued_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          data?: CertificateData;
          number?: string | null;
          status?: CertificateStatus;
          cancelled_reason?: string | null;
          cancelled_at?: string | null;
          created_by?: string;
          issued_by?: string | null;
          issued_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          data?: CertificateData;
          number?: string | null;
          status?: CertificateStatus;
          cancelled_reason?: string | null;
          cancelled_at?: string | null;
          created_by?: string;
          issued_by?: string | null;
          issued_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_editor: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      issue_certificate: {
        Args: { p_certificate_id: string };
        Returns: Database['public']['Tables']['certificates']['Row'];
      };
      cancel_certificate: {
        Args: { p_certificate_id: string; p_reason: string };
        Returns: Database['public']['Tables']['certificates']['Row'];
      };
    };
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
}
