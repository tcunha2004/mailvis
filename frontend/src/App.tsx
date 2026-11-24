import { BookOpen, Brain, Inbox as InboxIcon, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import Inbox from "./pages/Inbox";
import Instructions from "./pages/Instructions";
import Memory from "./pages/Memory";

const ROUTES = {
  inbox: { label: "Inbox", icon: InboxIcon, component: Inbox },
  memory: { label: "Memory", icon: Brain, component: Memory },
  instructions: { label: "Instructions", icon: SlidersHorizontal, component: Instructions },
};

type Route = keyof typeof ROUTES;

function currentRoute(): Route {
  const hash = window.location.hash.replace("#/", "");
  return hash in ROUTES ? (hash as Route) : "inbox";
}

export default function App() {
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    document.title = `${ROUTES[route].label} · MailVis`;
  }, [route]);

  const Page = ROUTES[route].component;

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/inbox">
          <img src="/favicon.svg" alt="" />
          MailVis
        </a>
        <nav className="nav" aria-label="Main">
          {(Object.keys(ROUTES) as Route[]).map((key) => {
            const { label, icon: Icon } = ROUTES[key];
            return (
              <a key={key} href={`#/${key}`} aria-current={route === key ? "page" : undefined} title={label}>
                <Icon size={16} />
                <span>{label}</span>
              </a>
            );
          })}
        </nav>
        <a className="docs-link" href="/docs" target="_blank" rel="noreferrer" title="API docs">
          <BookOpen size={15} />
          <span>API docs</span>
        </a>
      </header>
      <main className="main">
        <Page />
      </main>
    </div>
  );
}
