export interface Media {
  id: number;
  user_id: number;
  file_name: string;
  file_path: string;
  thumbnail_path: string;
  hash: string;
  uploaded_at: string;
  media_type: 'image' | 'video';
}

export interface UploadResponse {
  success: boolean;
  message: string;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}