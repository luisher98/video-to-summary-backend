export const mockYouTubeResponse = {
    videoInfo: {
        title: "Mock Video Title",
        description: "This is a mock video description",
        duration: "PT10M30S",
        thumbnail: "https://mock-thumbnail.jpg"
    },
    transcript: {
        text: "This is a mock transcript of the video content. It contains what would normally be the extracted audio converted to text.",
        segments: [
            { start: 0, end: 5, text: "First segment" },
            { start: 5, end: 10, text: "Second segment" }
        ]
    }
};

// Mock the video processing functions
export const mockVideoProcessing = {
    downloadVideo: jest.fn().mockResolvedValue("mock-video-id"),
    deleteVideo: jest.fn().mockResolvedValue(undefined),
    getTranscript: jest.fn().mockResolvedValue(mockYouTubeResponse.transcript),
    getVideoInfo: jest.fn().mockResolvedValue(mockYouTubeResponse.videoInfo)
}; 