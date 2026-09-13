export const SCHEME_TAGS = ['Central', 'State', 'Insurance', 'Credit', 'Registers'] as const;
export type SchemeTag = (typeof SCHEME_TAGS)[number];

export interface Scheme {
  id: string;
  name: string;
  tag: SchemeTag;
  description: string;
  fileUrl: string | null;
  fileName: string | null;
  createdBy: string | null;
  createdAt: string;
}
