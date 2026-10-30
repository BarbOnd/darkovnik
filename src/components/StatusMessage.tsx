type StatusMessageProps = {
  kind: "loading" | "error";
  message?: string;
};

export function StatusMessage({ kind, message }: StatusMessageProps) {
  if (kind === "loading") {
    return (
      <p className="status-message" role="status">
        {message ?? "Načítám…"}
      </p>
    );
  }
  return (
    <p className="status-message status-message--error" role="alert">
      {message ?? "Něco se nepovedlo. Zkuste to prosím znovu."}
    </p>
  );
}
