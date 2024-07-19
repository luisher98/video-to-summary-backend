export type VideoInfo = {
  id: string;
  title: string;
  trimmedDescription: string;
  mediumThumbnail: {
    url: string;
    width: number;
    height: number;
  };
  channelTitle: string;
};

export type YouTubeApiResponse = {
    items: YouTubeVideo[];
  }

type Thumbnail = {
  url: string;
  width: number;
  height: number;
}

type Snippet = {
  title: string;
  description: string;
  thumbnails: {
    medium: Thumbnail;
  };
  channelTitle: string;
}

type YouTubeVideo = {
  snippet: Snippet;
}


