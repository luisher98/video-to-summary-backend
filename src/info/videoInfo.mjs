export default async function videoInfo(url) {
  const id = url.split("?v=")[1];

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=${id}&key=${YOUTUBE_API_KEY}&part=snippet`
  );

  const data = await response.json();
  const snippet = data.items[0].snippet;

  const { title, thumbnails, channelTitle } = snippet;

  return { id, title, thumbnails, channelTitle };
}
