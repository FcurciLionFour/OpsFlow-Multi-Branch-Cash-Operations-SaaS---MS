export class BranchResponseDto {
  id: string;
  organizationId: string;
  name: string;
  code?: string | null;
  cashLimit?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
