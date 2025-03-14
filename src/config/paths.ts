import { fileURLToPath } from 'url';
import path from 'path';
import { dirname } from 'path';
import fs from 'fs';

/**
 * Configuration for application paths
 * @module paths
 */

/**
 * Validates a path and ensures it exists if required
 * @throws {Error} If path is invalid or doesn't exist (when required)
 */
function validatePath(pathToCheck: string, isOptional = false): string {
    try {
        if (!path.isAbsolute(pathToCheck)) {
            pathToCheck = path.resolve(rootDir, pathToCheck);
        }
        
        // In development, create directories if they don't exist
        if (!fs.existsSync(pathToCheck)) {
            if (process.env.NODE_ENV === 'development') {
                fs.mkdirSync(pathToCheck, { recursive: true });
            } else if (!isOptional) {
                throw new Error(`Path does not exist: ${pathToCheck}`);
            }
        }
        return pathToCheck;
    } catch (error) {
        throw new Error(`Invalid path: ${pathToCheck} - ${error instanceof Error ? error.message : String(error)}`);
    }
}

// Get the directory name of the current module first
const currentFileUrl = import.meta.url;
const currentFilePath = fileURLToPath(currentFileUrl);
// When running from dist, we need to go up to the project root
const rootDir = path.dirname(path.dirname(path.dirname(currentFilePath))); // Always go up from dist/src/config to project root

// Validate root directory
if (!fs.existsSync(path.join(rootDir, 'package.json'))) {
    throw new Error(`Invalid root directory: ${rootDir} (no package.json found)`);
}

// Ensure data directory exists
const dataDir = path.join(rootDir, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created data directory: ${dataDir}`);
}

/**
 * Environment-based path configuration
 * @readonly
 */
export const PathConfig = Object.freeze({
    // Base directories
    rootDir,
    dataDir: process.env.DATA_DIR ? 
        path.resolve(process.env.DATA_DIR) : 
        path.join(rootDir, 'data'),
    
    // Source and build directories
    sourceRoot: process.env.SOURCE_DIR ? 
        path.resolve(rootDir, process.env.SOURCE_DIR) : 
        path.join(rootDir, 'src'),
    distRoot: process.env.DIST_DIR ? 
        path.resolve(rootDir, process.env.DIST_DIR) : 
        path.join(rootDir, 'dist'),
    
    // Temporary directories
    tempRoot: process.env.TEMP_DIR ? 
        path.resolve(process.env.TEMP_DIR) : 
        path.join(rootDir, 'data', 'tmp'),
        
    // Ensure all paths are absolute
    resolvePath: (...segments: string[]) => path.resolve(rootDir, ...segments)
});

// Log the paths being used
console.log('Paths configuration:', {
    rootDir,
    dataDir: PathConfig.dataDir,
    tempRoot: PathConfig.tempRoot,
    sourceRoot: PathConfig.sourceRoot,
    distRoot: PathConfig.distRoot
});

/**
 * Static paths that don't change during runtime
 * @readonly
 */
export const StaticPaths = Object.freeze({
    /** Root directory of the project */
    ROOT: rootDir,
    /** Source code directory */
    SRC: validatePath(path.join(rootDir, PathConfig.sourceRoot)),
    /** Distribution directory */
    DIST: validatePath(path.join(rootDir, PathConfig.distRoot), true),
    /** Services directory */
    SERVICES: validatePath(path.join(rootDir, PathConfig.sourceRoot, 'services')),
    /** Utilities directory */
    UTILS: validatePath(path.join(rootDir, PathConfig.sourceRoot, 'utils')),
    /** Server directory */
    SERVER: validatePath(path.join(rootDir, PathConfig.sourceRoot, 'server'))
});

/**
 * Temporary directory configuration with validation
 * @readonly
 */
export const TempPaths = Object.freeze({
    ROOT: PathConfig.tempRoot,
    get UPLOADS() { return validatePath(path.join(PathConfig.tempRoot, 'uploads'), true) },
    get AUDIOS() { return validatePath(path.join(PathConfig.tempRoot, 'audios'), true) },
    get TRANSCRIPTS() { return validatePath(path.join(PathConfig.tempRoot, 'transcripts'), true) },
    get COOKIES() { return validatePath(path.join(PathConfig.tempRoot, 'cookies'), true) },
    get SESSIONS() { return validatePath(path.join(PathConfig.tempRoot, 'sessions'), true) }
});

// For backward compatibility
export const VIDEO_DOWNLOAD_PATH = TempPaths.AUDIOS;

/**
 * Path resolution functions with validation
 * @readonly
 */
export const PathResolver = Object.freeze({
    /**
     * Resolves a path relative to the project root
     * @throws {Error} If resulting path is invalid
     */
    resolve(...pathSegments: string[]): string {
        return validatePath(path.join(rootDir, ...pathSegments), true);
    },
    
    /**
     * Resolves a path relative to the src directory
     * @throws {Error} If resulting path is invalid
     */
    resolveSrc(...pathSegments: string[]): string {
        return validatePath(path.join(rootDir, PathConfig.sourceRoot, ...pathSegments), true);
    },
    
    /**
     * Resolves a path relative to the utils directory
     * @throws {Error} If resulting path is invalid
     */
    resolveUtils(...pathSegments: string[]): string {
        return validatePath(path.join(rootDir, PathConfig.sourceRoot, 'utils', ...pathSegments), true);
    }
});

// Type definitions
type StaticPathsType = typeof StaticPaths;
type TempPathsType = typeof TempPaths;
type PathResolverType = typeof PathResolver;
type PathConfigType = typeof PathConfig;

/**
 * Combined paths object with all path-related functionality
 * @readonly
 */
export const Paths = Object.freeze({
    ...StaticPaths,
    TEMP: TempPaths,
    CONFIG: PathConfig,
    resolve: PathResolver.resolve,
    resolveSrc: PathResolver.resolveSrc,
    resolveUtils: PathResolver.resolveUtils
});

type PathsType = typeof Paths;

/**
 * Type-safe path getter
 * @throws {Error} If path key doesn't exist
 */
export function getPath<K extends keyof PathsType>(pathKey: K): PathsType[K] {
    if (!(pathKey in Paths)) {
        throw new Error(`Invalid path key: ${String(pathKey)}`);
    }
    return Paths[pathKey];
}

export default Paths; 