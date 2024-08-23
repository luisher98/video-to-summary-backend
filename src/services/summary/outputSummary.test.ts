import { outputSummary } from './outputSummary';
import { downloadVideo, deleteVideo } from './videoTools';
import { generateTranscript, generateSummary } from '../../lib/openAI';
import { ProgressUpdate } from '../../types/global.types';

// Mock the dependencies
jest.mock('./videoTools', () => ({
  downloadVideo: jest.fn(),
  deleteVideo: jest.fn(),
}));

jest.mock('../../lib/openAI', () => ({
  generateTranscript: jest.fn(),
  generateSummary: jest.fn(),
}));

describe('outputSummary', () => {
  const mockUrl = 'https://www.youtube.com/watch?v=example123';
  const mockId = 'example123';
  const mockTranscript = 'This is a sample transcript.';
  const mockSummary = 'This is a sample summary.';
  const mockWords = 100;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should download the video, generate a transcript, and return a summary', async () => {
    // Arrange
    (downloadVideo as jest.Mock).mockResolvedValueOnce(undefined);
    (generateTranscript as jest.Mock).mockResolvedValueOnce(mockTranscript);
    (generateSummary as jest.Mock).mockResolvedValueOnce(mockSummary);
    (deleteVideo as jest.Mock).mockResolvedValueOnce(undefined);

    // Act
    const result = await outputSummary(mockUrl, mockWords);

    // Assert
    expect(downloadVideo).toHaveBeenCalledWith(mockUrl, mockId);
    expect(generateTranscript).toHaveBeenCalledWith(mockId);
    expect(generateSummary).toHaveBeenCalledWith(mockTranscript, mockWords);
    expect(deleteVideo).toHaveBeenCalledWith(mockId);
    expect(result).toBe(mockSummary);
  });

  it('should handle progress updates correctly', async () => {
    // Arrange
    (downloadVideo as jest.Mock).mockResolvedValueOnce(undefined);
    (generateTranscript as jest.Mock).mockResolvedValueOnce(mockTranscript);
    (generateSummary as jest.Mock).mockResolvedValueOnce(mockSummary);
    (deleteVideo as jest.Mock).mockResolvedValueOnce(undefined);

    const mockUpdateProgress = jest.fn();

    // Act
    await outputSummary(mockUrl, mockWords, mockUpdateProgress);

    // Assert
    expect(mockUpdateProgress).toHaveBeenCalledWith({ status: 'pending', message: 'Downloading video...' });
    expect(mockUpdateProgress).toHaveBeenCalledWith({ status: 'pending', message: 'Generating transcript...' });
    expect(mockUpdateProgress).toHaveBeenCalledWith({ status: 'pending', message: 'Almost done! Generating summary...' });
  });

  it('should throw an error if the URL is invalid', async () => {
    // Arrange
    const invalidUrl = 'invalid-url';

    // Act & Assert
    await expect(outputSummary(invalidUrl, mockWords)).rejects.toThrow('Invalid YouTube URL');
  });

  it('should handle errors during video processing', async () => {
    // Arrange
    const mockError = new Error('Test Error');
    (downloadVideo as jest.Mock).mockRejectedValueOnce(mockError);

    // Act & Assert
    await expect(outputSummary(mockUrl, mockWords)).rejects.toThrow('An error occurred:');
    expect(downloadVideo).toHaveBeenCalledWith(mockUrl, mockId);
  });

  it('should still generate a summary if deleting the video fails', async () => {
    // Arrange
    (downloadVideo as jest.Mock).mockResolvedValueOnce(undefined);
    (generateTranscript as jest.Mock).mockResolvedValueOnce(mockTranscript);
    (generateSummary as jest.Mock).mockResolvedValueOnce(mockSummary);
    (deleteVideo as jest.Mock).mockRejectedValueOnce(new Error('Delete failed'));

    // Act
    const result = await outputSummary(mockUrl, mockWords);

    // Assert
    expect(result).toBe(mockSummary);
    expect(deleteVideo).toHaveBeenCalledWith(mockId);
  });
});
