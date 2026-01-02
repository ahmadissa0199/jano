
export interface VideoSegment {
  timestamp_start: string; // MM:SS format
  timestamp_end: string;   // MM:SS format
  original_text: string;
  translated_text: string;
  explanation: string;
}

export interface VideoMetadata {
  source_lang: string;
  target_lang: string;
}

export interface GeminiResponse {
  video_metadata: VideoMetadata;
  segments: VideoSegment[];
}

export interface AppState {
  videoFile: File | null;
  videoUrl: string | null;
  youtubeId: string | null;
  videoSrc: string | null;
  isLoading: boolean;
  error: string | null;
  results: GeminiResponse | null;
  currentTime: number;
}
