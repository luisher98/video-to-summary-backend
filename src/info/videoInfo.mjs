import fetch from "node-fetch";

export default async function videoInfo(url) {
  const id = url.split("?v=")[1];

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=${id}&key=${YOUTUBE_API_KEY}&part=snippet`
  );

  const data = await response.json();
  const snippet = data.items[0].snippet;

  const { title, description, thumbnails, channelTitle } = snippet;

  function shortenString(str, maxLength) {
    if (str.length > maxLength) {
      return str.substring(0, maxLength) + '...';
    }
    return str;
  }

  const trimmedDescription = shortenString(description, 200);

  // const mediumThumbnail = thumbnails.medium;

  return { id, title, trimmedDescription, thumbnails, channelTitle };
}
