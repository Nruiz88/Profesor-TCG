import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownViewProps {
  content: string
}

const components = {
  h1: (props: React.ComponentProps<'h1'>) => (
    <h1
      className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
      {...props}
    />
  ),
  h2: (props: React.ComponentProps<'h2'>) => (
    <h2
      className="mt-10 border-b border-slate-800/80 pb-2 text-lg font-semibold text-white sm:text-xl"
      {...props}
    />
  ),
  h3: (props: React.ComponentProps<'h3'>) => (
    <h3 className="mt-8 text-base font-semibold text-white" {...props} />
  ),
  h4: (props: React.ComponentProps<'h4'>) => (
    <h4 className="mt-6 text-sm font-semibold text-slate-200" {...props} />
  ),
  p: (props: React.ComponentProps<'p'>) => (
    <p className="mt-4 text-sm leading-relaxed text-slate-400" {...props} />
  ),
  a: (props: React.ComponentProps<'a'>) => (
    <a
      className="font-medium text-emerald-400 underline decoration-emerald-400/40 underline-offset-2 transition-colors hover:text-emerald-300"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  ul: (props: React.ComponentProps<'ul'>) => (
    <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-400" {...props} />
  ),
  ol: (props: React.ComponentProps<'ol'>) => (
    <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-400" {...props} />
  ),
  li: (props: React.ComponentProps<'li'>) => <li className="pl-1" {...props} />,
  blockquote: (props: React.ComponentProps<'blockquote'>) => (
    <blockquote
      className="mt-4 rounded-r-lg border-l-2 border-emerald-500/60 bg-emerald-500/5 px-4 py-2 text-sm italic leading-relaxed text-slate-300"
      {...props}
    />
  ),
  code: (props: React.ComponentProps<'code'>) => (
    <code
      className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[12.5px] font-medium text-emerald-300"
      {...props}
    />
  ),
  pre: (props: React.ComponentProps<'pre'>) => (
    <pre
      className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-[12.5px] leading-relaxed text-slate-200"
      {...props}
    />
  ),
  table: (props: React.ComponentProps<'table'>) => (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm" {...props} />
    </div>
  ),
  thead: (props: React.ComponentProps<'thead'>) => (
    <thead className="border-b border-slate-700 text-slate-200" {...props} />
  ),
  th: (props: React.ComponentProps<'th'>) => (
    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider" {...props} />
  ),
  td: (props: React.ComponentProps<'td'>) => (
    <td className="border-b border-slate-800/80 px-3 py-2 text-slate-400" {...props} />
  ),
  hr: (props: React.ComponentProps<'hr'>) => (
    <hr className="my-8 border-slate-800" {...props} />
  ),
  strong: (props: React.ComponentProps<'strong'>) => (
    <strong className="font-semibold text-slate-200" {...props} />
  ),
  em: (props: React.ComponentProps<'em'>) => (
    <em className="italic text-slate-300" {...props} />
  )
}

export default function MarkdownView({ content }: MarkdownViewProps) {
  return (
    <div className="nota-prose">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </Markdown>
    </div>
  )
}
