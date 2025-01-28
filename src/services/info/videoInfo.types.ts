/**
 * Video metadata returned by the info service
 */
export type VideoInfo = {
  /** YouTube video ID */
  id: string;
  /** Video title */
  title: string;
  /** Truncated video description */
  trimmedDescription: string;
  /** Medium quality thumbnail */
  mediumThumbnail: {
    /** Thumbnail URL */
    url: string;
    /** Thumbnail width in pixels */
    width: number;
    /** Thumbnail height in pixels */
    height: number;
  };
  /** Channel name */
  channelTitle: string;
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
 * Video data from YouTube API
 * @internal
 */
type YouTubeVideo = {
  snippet: Snippet;
}


