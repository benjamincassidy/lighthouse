// Tell TypeScript that *.css imports are valid strings (they are, via the
// esbuild text loader configured in esbuild.config.mjs).
declare module '*.css' {
  const content: string
  export default content
}
