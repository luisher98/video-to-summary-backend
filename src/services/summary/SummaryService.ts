/**
 * Summary Service Public API
 * @public
 * 
 * This is the only entry point that should be used by other parts of the application.
 * Do not import from internal directories directly.
 */

import {
  SummaryServiceFactory,
  type Progress,
  type ProcessingStatus,
  type Summary,
  type SummaryOptions,
  type MediaSource
} from './internal/internalBoundary.js';

// Re-export only the types and interfaces needed by consumers
export type {
  Summary,
  SummaryOptions,
  MediaSource,
  Progress,
  ProcessingStatus
};

// Export the factory for creating summary services
export { SummaryServiceFactory };
export default SummaryServiceFactory; 