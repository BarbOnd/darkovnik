import { useState } from "react";
import { version } from "../../../package.json";
import { useApp } from "../../app/AppContext";
import { paths } from "../../app/routes";
import { Link } from "../../components/Link";
import { ChevronIcon } from "../../components/icons";
import { ScreenHeader } from "../../components/ScreenHeader";
import { StatusMessage } from "../../components/StatusMessage";
import type { Theme } from "../../domain/entities";
import { BirthdayNotificationsSetting } from "../notifications/BirthdayNotificationsSetting";
import { DataSection } from "./DataSection";

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "SYSTEM", label: "Podle systému" },
  { value: "LIGHT", label: "Světlý" },
  { value: "DARK", label: "Tmavý" },
];

export function SettingsScreen() {
  const { metadata, updatePreferences } = useApp();
  const [failed, setFailed] = useState(false);

  return (
    <>
      <ScreenHeader title="Nastavení" />

      <BirthdayNotificationsSetting />

      <section className="section">
        <fieldset className="field">
          <legend className="section__title">Vzhled</legend>
          <div className="segmented">
            {THEME_OPTIONS.map((option) => (
              <label key={option.value} className="segmented__option">
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={metadata.theme === option.value}
                  onChange={() => {
                    setFailed(false);
                    updatePreferences({ theme: option.value }).catch(() => setFailed(true));
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {failed && <StatusMessage kind="error" message="Nastavení se nepodařilo uložit." />}
      </section>

      <section className="section">
        <Link className="settings-link" href={paths.tags()}>
          <span>Štítky</span>
          <ChevronIcon />
        </Link>
      </section>

      <DataSection />

      <section className="section" aria-labelledby="about-heading">
        <h2 id="about-heading" className="section__title">
          O aplikaci
        </h2>
        <p className="muted">Dárkovník, verze {version}</p>
        <p className="muted">Všechny dárky pod jednou mašlí.</p>
        <p className="muted">Všechna data zůstávají jen v tomto zařízení.</p>
      </section>
    </>
  );
}
