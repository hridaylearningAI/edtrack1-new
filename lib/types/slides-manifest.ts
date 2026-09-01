/**
 * Lecture slides manifest: folder names and ordered slide filenames per folder.
 * Same shape as Practice Q manifest; stored in course_content_overrides.slides_manifest
 * or optional CDN file slides-manifest.json.
 */

export interface SlidesFolderEntry {
  folder: string
  slides: string[]
}

export interface SlidesManifest {
  folders: SlidesFolderEntry[]
}
