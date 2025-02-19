/// <reference types="vite/client" /> // v4.4.0

/**
 * Type definitions for Vite environment variables including API and Auth0 configuration
 */
interface ImportMetaEnv {
  /** Base URL for the API endpoints */
  readonly VITE_API_URL: string;
  
  /** Auth0 domain for authentication */
  readonly VITE_AUTH0_DOMAIN: string;
  
  /** Auth0 client ID for application identification */
  readonly VITE_AUTH0_CLIENT_ID: string;
  
  /** Auth0 audience identifier for API access */
  readonly VITE_AUTH0_AUDIENCE: string;
}

/**
 * Augments the ImportMeta interface to include env
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Type definition for static image imports with dimension information
 */
interface StaticImageImport {
  /** Source URL of the imported image */
  src: string;
  
  /** Width of the image in pixels */
  width: number;
  
  /** Height of the image in pixels */
  height: number;
}

/**
 * Type definition for general static asset imports
 */
type StaticAssetImport = {
  /** Default import path for the static asset */
  default: string;
};

/**
 * Type definitions for module imports
 */
declare module '*.svg' {
  const content: StaticAssetImport;
  export default content;
}

declare module '*.png' {
  const content: StaticImageImport;
  export default content;
}

declare module '*.jpg' {
  const content: StaticImageImport;
  export default content;
}

declare module '*.jpeg' {
  const content: StaticImageImport;
  export default content;
}

declare module '*.gif' {
  const content: StaticImageImport;
  export default content;
}

declare module '*.webp' {
  const content: StaticImageImport;
  export default content;
}

declare module '*.avif' {
  const content: StaticImageImport;
  export default content;
}

declare module '*.ico' {
  const content: StaticAssetImport;
  export default content;
}

declare module '*.bmp' {
  const content: StaticImageImport;
  export default content;
}

declare module '*.json' {
  const content: any;
  export default content;
}