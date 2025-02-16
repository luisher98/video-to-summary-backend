import { fileURLToPath } from 'url';
import path from 'path';
import { dirname } from 'path';

// Get the directory name of the current module
const currentFileUrl = import.meta.url;
const currentFilePath = fileURLToPath(currentFileUrl);
const rootDir = path.join(dirname(currentFilePath), '..', '..');

/**
 * Static paths that are strings
 */
export const StaticPaths = {
    // Root paths
    ROOT: rootDir,
    SRC: path.join(rootDir, 'src'),
    DIST: path.join(rootDir, 'dist'),
    
    // Source directories
    SERVICES: path.join(rootDir, 'src', 'services'),
    UTILS: path.join(rootDir, 'src', 'utils'),
    SERVER: path.join(rootDir, 'src', 'server'),
} as const;

/**
 * Temp directory configuration
 */
export const TempPaths = {
    ROOT: process.env.TEMP_DIR ? 
        path.resolve(process.env.TEMP_DIR) : 
        path.join(process.cwd(), 'tmp'),
    get UPLOADS() { return path.join(this.ROOT, 'uploads') },
    get AUDIOS() { return path.join(this.ROOT, 'audios') },
    get TRANSCRIPTS() { return path.join(this.ROOT, 'transcripts') },
    get COOKIES() { return path.join(this.ROOT, 'cookies') },
    get SESSIONS() { return path.join(this.ROOT, 'sessions') }
} as const;

/**
 * Path resolution functions
 */
export const PathResolver = {
    /**
     * Resolves a path relative to the project root
     */
    resolve(...pathSegments: string[]): string {
        return path.join(rootDir, ...pathSegments);
    },
    
    /**
     * Resolves a path relative to the src directory
     */
    resolveSrc(...pathSegments: string[]): string {
        return path.join(rootDir, 'src', ...pathSegments);
    },
    
    /**
     * Resolves a path relative to the utils directory
     */
    resolveUtils(...pathSegments: string[]): string {
        return path.join(rootDir, 'src', 'utils', ...pathSegments);
    }
} as const;

// Define the type for static paths
type StaticPathsType = typeof StaticPaths;
type TempPathsType = typeof TempPaths;
type PathResolverType = typeof PathResolver;

export const Paths = {
    ...StaticPaths,
    TEMP: TempPaths,
    resolve: PathResolver.resolve,
    resolveSrc: PathResolver.resolveSrc,
    resolveUtils: PathResolver.resolveUtils
} as const;

type PathsType = typeof Paths;

/**
 * Type-safe path getter that handles different types of path values
 */
export function getPath<K extends keyof PathsType>(pathKey: K): PathsType[K] {
    return Paths[pathKey];
}

export default Paths; 