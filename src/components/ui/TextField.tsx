import { useId, type InputHTMLAttributes } from "react";

export const FIELD_CLASS =
  "w-full rounded-xl border-2 border-strong bg-card px-3 py-3 text-base text-ink placeholder:text-soft";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function TextField({ label, value, onChange, className = "", ...rest }: TextFieldProps) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-bold uppercase tracking-wide text-soft">
        {label}
      </label>
      <input
        id={id}
        className={FIELD_CLASS}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={80}
        autoComplete="off"
        enterKeyHint="done"
        {...rest}
      />
    </div>
  );
}
