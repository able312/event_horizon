import React, { type ReactNode } from "react"

const Root: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
      <div className="h-screen w-full overflow-hidden bg-stone-100">
        <div className="flex h-full min-h-0">
         { children }
        </div>
      </div>
    )
}

const PanelWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
      <aside className="dark flex w-1/5 min-w-[260px] max-w-[360px] shrink-0 min-h-0 flex-col border-r border-white/20 bg-stone-900 text-stone-100">
        { children }
      </aside>
    )
}

const BodyWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
     <section className="flex min-w-0 flex-1 min-h-0 flex-col bg-background">
        { children }
      </section>
    )
}

export const SplitLayout = Object.assign(Root, {
    PanelWrapper,
    BodyWrapper,
})

const PanelHeader: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
      <div
        className="window-drag-bar shrink-0 border-b border-white/10 h-10 flex items-center justify-end pl-20 pr-2"
        data-testid="events-sidebar-header"
      >
        { children }
      </div>
    )
}
const PanelContent: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto" data-testid="events-sidebar-body">
        { children }
      </div>
    )
}

export const Panel = {
  Header: PanelHeader,
  Content: PanelContent
}



const BodyHeader: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
     <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6 window-drag-bar max-h-[40px]">
        { children }
      </div>
    )
}
const BodyContent: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
     <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
        { children }
      </div>
    )
}

export const Body = {
  Header: BodyHeader,
  Content: BodyContent
}


