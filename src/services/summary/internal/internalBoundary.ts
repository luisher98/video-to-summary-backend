/**
 * Internal Module Boundary
 * @internal
 * 
 * This is a standardized boundary between internal implementations and the public API.
 * Each root-level "internal" directory must have this file to control what gets exposed
 * to the public interface.
 * 
 * Key principles:
 * 1. Only expose what's necessary for the public API
 * 2. Keep implementation details hidden
 * 3. Maintain a clean, minimal public interface
 * 4. All exports must be explicitly listed here
 * 
 * Usage:
 * - External code must never import directly from internal modules
 * - All access must go through the service's public API
 * - The public API imports only from this boundary file
 * - Subdirectories of "internal" don't need their own boundary
 */

// Export factory for creating service instances
export { SummaryServiceFactory } from './factories/SummaryServiceFactory.js';

// Export public types
export type { Progress, ProcessingStatus } from './types/progress.types.js';
export type { Summary, SummaryOptions } from './types/summary.types.js';
export type { MediaSource } from './interfaces/IMediaProcessor.js'; 