export interface Media {
  id: number;
  file_name: string;
  file_path: string;
  thumbnail_path: string;
  media_type: 'image' | 'video';
  uploaded_at: string;
  capture_date: string | null;
}

export interface UploadResponse {
  success: boolean;
  message: string;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}