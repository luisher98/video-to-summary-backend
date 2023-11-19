# TubeSummary server by Luis Hernández

This is the API of a youtube summarization tool that utilizes OpenAI's GPT-3 language model to generate summaries of audio transcripts by providing the youtube link.

You can check out the [front-end](https://github.com/luisher98/tubesummary-server) for this project.

Or you can also [try it out yourself](https://youtube-summary-ezim.onrender.com/api/info?url=https://www.youtube.com/watch?v=A4_TFHzqAAg).

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Video Information Retrieval](#video-information-retrieval)
  - [Summary Generation](#summary-generation)
- [Usage](#usage)
- [Example](#example)

## Getting Started

### Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js installed
- npm or yarn installed
- OpenAI API Key and Google Cloud API Key (You can obtain this from the OpenAI website or you can contact me and i'll provide you with mine)


### Installation

1. Clone the repository:
   ```
   git clone https://github.com/luisher98/tubesummary-server.git
2. Navigate to the project directory:
   ```
   cd tubesummary-server
3. Install dependencies
   ```
   npm install
   # or
   yarn install
4. Create a .env file in the directory and add the OpenAI API key
    ```
    OPENAI_API_KEY = ...
    YOUTUBE_API_KEY = ...
5. Run the following command to start the server
   ```
   node app
6. Paste this link following a YouTube link in the browser to test it
   ```
   http://localhost:5000/api/summary?url=...
### Example

   This request:
   ```
   http://localhost:5000/api/summary?url=https://www.youtube.com/watch?v=NQ0v5ZbKJl0
   ```

   Should return the following JSON:
   ```
   {
   "result": "In this transcript, the speaker discusses their experience using two different AI tools: ChatGPT and PentestGPT. They mention that ChatGPT has been very helpful in their daily life, assisting with various tasks and providing valuable information. However, they express some skepticism about PentestGPT, a tool designed for hacking and solving machines on platforms like Hack the Box.\n\nThe speaker explains that PentestGPT has received a lot of attention and positive reviews, but they had previously encountered issues with it and stopped using it. They decide to give it another try and see if it can successfully solve a machine they recently worked on. They follow the instructions provided by the AI, running commands and copying the results.\n\nDuring the process, the speaker realizes that PentestGPT doesn't provide all the necessary information. For example, it doesn't mention the virtual hosting applied to the machine they are trying to hack. They try to communicate this issue to the AI, but it doesn't seem to understand their request properly. The speaker continues to follow the AI's instructions but finds that it doesn't provide the guidance they were hoping for.\n\nThey express frustration with the lack of helpful information and the limitations of the AI tool. They mention that while the concept is interesting, the implementation is not effective. The speaker concludes that PentestGPT is not as useful as they had hoped and expresses disappointment in the amount of money they spent on using the tool.\n\nIn the end, they decide that it is better to learn from human experts rather than relying on AI tools like PentestGPT. They express their intention to seek guidance from experienced individuals in the field of penetration testing. The speaker also mentions their initial plan to create a YouTube video about their experience with PentestGPT but decides against it due to the tool's limitations."
   }
   ```
## Usage
The server is hosted at [https://youtube-summary-ezim.onrender.com]([https://youtube-summary-ezim.onrender.com](https://youtube-summary-ezim.onrender.com/api/info?url=https://www.youtube.com/watch?v=-yIsQPp31L0)). 

You can use the endpoints in the section below.

### Retrieving Video Information
To get details about a YouTube Video:

Endpoint
```
https://youtube-summary-ezim.onrender.com/api/info?url=<YouTube-Video-URL>
```

This returns a JSON object with the video's ID, title, description, thumbnail, and channel details.

### Generating Video Summaries

To generate a summary for a YouTube video:

Endpoint:
```
https://youtube-summary-ezim.onrender.com/api/summary?url=<YouTube-Video-URL>&words=<Word-Count>
```
Specify the desired word count for the summary. This returns a JSON object with the video summary.

## Examples
1. Video Information Retrieval:
  ```
  https://youtube-summary-ezim.onrender.com/api/info?url=https://www.youtube.com/watch?v=-yIsQPp31L0
  ```
Output: JSON with video details like title, description, and thumbnail.

2. Summary Generation:
  ```
  https://youtube-summary-ezim.onrender.com/api/summary?url=https://www.youtube.com/watch?v=NQ0v5ZbKJl0&words=400
  ```
Output: A 400-word summary of the video in JSON format.
