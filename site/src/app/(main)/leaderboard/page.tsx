import { getLeaderboardData } from '@/lib/data';
import { LeaderboardTabs } from '@/components/leaderboard/LeaderboardTabs';
import { Footer } from '@/components/layout/Footer';

export default function LeaderboardPage() {
  const data = getLeaderboardData();

  return (
    <>
      <div className="max-w-7xl px-4 py-6 mx-auto">
        <div className="flex gap-8">
          <div className="flex-1 min-w-0">
            <LeaderboardTabs data={data} />
          </div>
          <aside className="hidden lg:block w-[220px] shrink-0 pt-20">
            <div className="sticky top-24 text-center">
              <p className="retro text-sm text-primary leading-relaxed">
                <span className="text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]">♔</span>
                {' '}葬AI Web4
              </p>
              <p className="retro text-sm text-primary">唯一指定金主</p>
              <p className="retro text-base font-bold text-foreground mt-2 drop-shadow-[0_0_8px_rgba(115,81,207,0.5)]">
                Justin
              </p>
              <p className="retro text-xs text-muted-foreground mt-1">（功德+200）</p>
              <div className="mt-3 mx-auto w-3/4 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            </div>
          </aside>
        </div>
      </div>
      <Footer />
    </>
  );
}
