/// <reference types="vite/client" />

// Vite Web Worker 支援
declare module '*?worker' {
  const WorkerConstructor: new () => Worker
  export default WorkerConstructor
}

declare module '*?worker&inline' {
  const WorkerConstructor: new () => Worker
  export default WorkerConstructor
}
