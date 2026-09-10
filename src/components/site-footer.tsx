type Props = {
  androidApkUrl?: string;
};

export function SiteFooter({ androidApkUrl }: Props) {
  return (
    <footer className="relative z-10 border-t border-border/60 bg-background/95">
      <div className="flex flex-col gap-3 px-5 py-6 text-sm text-muted-foreground pb-safe sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-base font-bold tracking-tight text-foreground">Serveo</span>
          <span className="text-xs tracking-[0.14em] uppercase">Gérer · Servir · Simplifier</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs tracking-wide">
          <span>FCFA · Orange Money · MTN MoMo · Wave</span>
          {androidApkUrl ? (
            <a
              href={androidApkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              App Android
            </a>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
