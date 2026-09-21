export type LearningMaterialDTO = {
  id: string;
  batchId: string;
  batchName: string;
  subject: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  facultyName: string;
  createdAt: string;
};
