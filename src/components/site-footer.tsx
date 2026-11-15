type Props = {
  androidApkUrl?: string;
};

export function SiteFooter({ androidApkUrl }: Props) {
  return (
    <footer className="relative z-10 border-t border-border/60 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-muted-foreground pb-safe sm:flex-row sm:items-center sm:justify-between sm:px-10 xl:px-14">
        <div className="flex flex-col gap-1.5">
          <span className="text-base font-bold tracking-tight text-foreground">Serveo</span>
          <span className="text-xs tracking-[0.14em] uppercase">
            Gérer · Servir · Simplifier
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs tracking-wide">
          <span>FCFA · Orange Money · MTN MoMo · Wave</span>
          {androidApkUrl ? (
            <a
              href={androidApkUrl}
              download="serveo.apk"
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
