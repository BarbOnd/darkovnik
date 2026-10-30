import { useId } from "react";
import { MONTH_NAMES } from "../../lib/format";
import type { BirthdayFields } from "./birthdayFields";

type BirthdayInputProps = {
  value: BirthdayFields;
  onChange(value: BirthdayFields): void;
  invalid?: boolean;
};

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

export function BirthdayInput({ value, onChange, invalid = false }: BirthdayInputProps) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <fieldset className="field birthday-input">
      <legend className="field__label">Narozeniny (nepovinné)</legend>
      <div className="birthday-input__row">
        <div className="birthday-input__part">
          <label htmlFor={`${id}-day`}>Den</label>
          <select
            id={`${id}-day`}
            value={value.day}
            aria-invalid={invalid}
            onChange={(event) => onChange({ ...value, day: event.target.value })}
          >
            <option value="">–</option>
            {DAYS.map((day) => (
              <option key={day} value={String(day)}>
                {day}.
              </option>
            ))}
          </select>
        </div>
        <div className="birthday-input__part birthday-input__part--month">
          <label htmlFor={`${id}-month`}>Měsíc</label>
          <select
            id={`${id}-month`}
            value={value.month}
            aria-invalid={invalid}
            onChange={(event) => onChange({ ...value, month: event.target.value })}
          >
            <option value="">–</option>
            {MONTH_NAMES.map((month, index) => (
              <option key={month} value={String(index + 1)}>
                {month}
              </option>
            ))}
          </select>
        </div>
        <div className="birthday-input__part">
          <label htmlFor={`${id}-year`}>Rok</label>
          <input
            id={`${id}-year`}
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            placeholder="neznám"
            value={value.year}
            aria-invalid={invalid}
            aria-describedby={hintId}
            onChange={(event) => onChange({ ...value, year: event.target.value })}
          />
        </div>
      </div>
      <p id={hintId} className="field__hint">
        Rok můžete nechat prázdný – pak se nebude zobrazovat věk.
      </p>
    </fieldset>
  );
}
