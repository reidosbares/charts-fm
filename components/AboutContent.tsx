'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AboutContentProps {
  content: string
}

export default function AboutContent({ content }: AboutContentProps) {
  if (!content) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">About content not available.</p>
      </div>
    )
  }

  return (
    <div className="prose prose-lg max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 mt-8 first:mt-0" {...props} />
          ),
          h2: ({ node, children, ...props }: any) => (
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 mt-8" {...props}>
              {children}
            </h2>
          ),
          h3: ({ node, children, ...props }: any) => (
            <h3 className="text-xl md:text-2xl font-semibold text-gray-800 mb-3 mt-6" {...props}>
              {children}
            </h3>
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-lg md:text-xl font-semibold text-gray-800 mb-2 mt-4" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="text-gray-700 mb-4 leading-relaxed" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="ml-4" {...props} />
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            const isCodeBlock = className && typeof className === 'string' && className.includes('language-')
            
            if (inline === true || !isCodeBlock) {
              return (
                <code
                  className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <code className="text-gray-800 text-sm font-mono" {...props}>
                {children}
              </code>
            )
          },
          pre: ({ node, children, ...props }: any) => (
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4" {...props}>
              {children}
            </pre>
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-8 border-gray-300" {...props} />
          ),
          blockquote: ({ node, children, ...props }: any) => (
            <blockquote
              className="border-l-4 border-[var(--theme-primary)] bg-yellow-50 pl-4 pr-4 py-3 my-4 rounded-r"
              {...props}
            >
              {children}
            </blockquote>
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-gray-900" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a
              className="text-[var(--theme-primary)] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

