export function Footer() {
  return (
    <footer className="border-t border-border py-6">
      <div className="mx-auto max-w-7xl px-4">
        <p className="retro text-center text-xs text-muted-foreground">
          葬AI Web4 &middot;{' '}
          <a
            href="https://funeralai.substack.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            funeralai.substack.com
          </a>
        </p>
        <p className="text-center text-[10px] text-muted-foreground/60 mt-1">
          &copy; 2026 葬AI &middot; MIT License
        </p>
      </div>
    </footer>
  );
}
