/**
 * Video metadata returned by the info service
 */
export type VideoInfo = {
  /** YouTube video ID */
  id: string;
  /** Video title */
  title: string;
  /** Video description */
  description: string;
  /** Thumbnail URL */
  thumbnailUrl: string;
  /** Channel name */
  channel: string;
  /** Video duration in seconds */
  duration: number;
};

/**
 * Response from YouTube Data API
 * @internal
 */
export type YouTubeApiResponse = {
  items: YouTubeVideo[];
}

/**
 * Thumbnail metadata from YouTube API
 * @internal
 */
type Thumbnail = {
  url: string;
  width: number;
  height: number;
}

/**
 * Video snippet from YouTube API
 * @internal
 */
type Snippet = {
  title: string;
  description: string;
  thumbnails: {
    medium: Thumbnail;
  };
  channelTitle: string;
}

/**
 * Video content details from YouTube API
 * @internal
 */
type ContentDetails = {
  duration: string;  // ISO 8601 duration format (e.g., PT1H2M10S)
}

/**
 * Video resource from YouTube API
 * @internal
 */
type YouTubeVideo = {
  snippet: Snippet;
  contentDetails: ContentDetails;
}


