import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "../components/Link";
import { PeopleIcon, SettingsIcon } from "../components/icons";
import { ScreenHeader } from "../components/ScreenHeader";
import { StatusMessage } from "../components/StatusMessage";
import {
  createGiftListRepository,
  type AppMetadata,
  type UpdatePreferencesInput,
} from "../db/repository";
import { EditGiftScreen } from "../features/gifts/GiftFormScreen";
import { QuickAddScreen } from "../features/gifts/QuickAddScreen";
import { PeopleScreen } from "../features/people/PeopleScreen";
import { PersonDetailScreen } from "../features/people/PersonDetailScreen";
import { EditPersonScreen, NewPersonScreen } from "../features/people/PersonFormScreen";
import { SettingsScreen } from "../features/settings/SettingsScreen";
import { TagsScreen } from "../features/tags/TagsScreen";
import { AppContext, type AppContextValue } from "./AppContext";
import { paths, useRoute, type Route } from "./routes";
import { applyTheme } from "./theme";

const TOAST_DURATION_MS = 2500;

type StartState ={ status: "loading" } | { status: "ready"; metadata: AppMetadata } | { status: "error" };

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case "people":
      return <PeopleScreen />;
    case "settings":
      return <SettingsScreen />;
    case "tags":
      return <TagsScreen />;
    case "personNew":
      return <NewPersonScreen />;
    case "person":
      return <PersonDetailScreen key={route.personId} personId={route.personId} />;
    case "personEdit":
      return <EditPersonScreen key={route.personId} personId={route.personId} />;
    case "quickAdd":
      return <QuickAddScreen key={route.personId ?? "none"} personId={route.personId} />;
    case "giftEdit":
      return <EditGiftScreen key={route.giftId} giftId={route.giftId} />;
    case "notFound":
      return (
        <>
          <ScreenHeader title="Stránka nenalezena" />
          <p className="status-message">
            Tahle stránka neexistuje. <Link href={paths.people()}>Zpět na seznam lidí</Link>
          </p>
        </>
      );
  }
}

function BottomNav({ route }: { route: Route }) {
  const settingsActive = route.name === "settings" || route.name === "tags";
  return (
    <nav className="bottom-nav" aria-label="Hlavní navigace">
      <Link
        className="bottom-nav__item"
        href={paths.people()}
        aria-current={settingsActive ? undefined : "page"}
      >
        <PeopleIcon />
        Lidé
      </Link>
      <Link
        className="bottom-nav__item"
        href={paths.settings()}
        aria-current={settingsActive ? "page" : undefined}
      >
        <SettingsIcon />
        Nastavení
      </Link>
    </nav>
  );
}

export function App() {
  const [repository] = useState(() => createGiftListRepository());
  const [start, setStart] = useState<StartState>({ status: "loading" });
  const route = useRoute();

  useEffect(() => {
    let active = true;
    repository
      .initialize()
      .then(() => repository.getMetadata())
      .then(
        (metadata) => active && setStart({ status: "ready", metadata }),
        () => active && setStart({ status: "error" }),
      );
    return () => {
      active = false;
    };
  }, [repository]);

  const theme = start.status === "ready" ? start.metadata.theme : "SYSTEM";
  useEffect(() => applyTheme(theme), [theme]);

  const updatePreferences = useCallback(
    async (input: UpdatePreferencesInput) => {
      const metadata = await repository.updatePreferences(input);
      setStart({ status: "ready", metadata });
    },
    [repository],
  );

  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const showToast = useCallback((message: string) => {
    // A new id restarts the timer even when the same message repeats.
    setToast((current) => ({ id: (current?.id ?? 0) + 1, message }));
  }, []);
  useEffect(() => {
    if (toast === null) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const context = useMemo<AppContextValue | null>(
    () =>
      start.status === "ready"
        ? { repository, metadata: start.metadata, updatePreferences, showToast }
        : null,
    [repository, start, updatePreferences, showToast],
  );

  return (
    <div className="app">
      <main className="app__main">
        {start.status === "loading" && <StatusMessage kind="loading" />}
        {start.status === "error" && (
          <StatusMessage
            kind="error"
            message="Data se nepodařilo otevřít. Zkuste aplikaci zavřít a znovu otevřít. V anonymním okně prohlížeče nemusí ukládání fungovat."
          />
        )}
        {context !== null && (
          <AppContext.Provider value={context}>
            <Screen route={route} />
          </AppContext.Provider>
        )}
      </main>
      <div className="toast-region" role="status" aria-live="polite">
        {toast !== null && (
          <p key={toast.id} className="toast">
            {toast.message}
          </p>
        )}
      </div>
      <BottomNav route={route} />
    </div>
  );
}
