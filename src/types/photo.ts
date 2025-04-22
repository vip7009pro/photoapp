export interface Photo {
  id: number;
  file_name: string;
  file_path: string;
  thumbnail_path: string;
  uploaded_at: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}