declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

// MathJax type declarations
interface MathJaxConfig {
  tex?: {
    inlineMath?: string[][]
    displayMath?: string[][]
    processEscapes?: boolean
    processEnvironments?: boolean
  }
  options?: {
    skipHtmlTags?: string[]
  }
}

interface MathJax {
  typesetPromise?: () => Promise<void>
  typeset?: () => void
}

interface Window {
  MathJax?: MathJax & MathJaxConfig
}
