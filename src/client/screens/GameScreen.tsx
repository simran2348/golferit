import { useMemo, useState } from 'react';
import type { CourseDefinition } from '../../shared/types/course';
import { GameCanvas } from '../components/GameCanvas';
import { Hud } from '../components/Hud';
import { LeaderboardPanel } from '../components/LeaderboardPanel';
import { ResultCard } from '../components/ResultCard';
import { GameSession } from '../game/logic/GameSession';
import { useGameSnapshot } from '../hooks/useGameSnapshot';
import { usePlayer } from '../hooks/usePlayer';
import { useScoreboard } from '../hooks/useScoreboard';
import { ScoreboardStore } from '../services/ScoreboardStore';

type GameScreenProps = {
  course: CourseDefinition;
};

export const GameScreen = ({ course }: GameScreenProps) => {
  const player = usePlayer();
  const session = useMemo(() => new GameSession(course), [course]);
  const scoreboardStore = useMemo(
    () => new ScoreboardStore(session),
    [session]
  );
  const snapshot = useGameSnapshot(session);
  const scoreboard = useScoreboard(scoreboardStore);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  const openLeaderboard = () => {
    setLeaderboardOpen(true);
    void scoreboardStore.refreshLeaderboard();
  };

  return (
    <main className="relative h-full w-full overflow-hidden bg-[#2fa6d9] select-none">
      <GameCanvas course={course} session={session} />
      <Hud
        course={course}
        player={player}
        snapshot={snapshot}
        scoreboard={scoreboard}
        onOpenLeaderboard={openLeaderboard}
      />
      {snapshot.result && !leaderboardOpen ? (
        <ResultCard
          result={snapshot.result}
          scoreboard={scoreboard}
          onPlayAgain={session.restart}
        />
      ) : null}
      {leaderboardOpen ? (
        <LeaderboardPanel
          scoreboard={scoreboard}
          onClose={() => setLeaderboardOpen(false)}
          onRetry={() => void scoreboardStore.refreshLeaderboard()}
        />
      ) : null}
    </main>
  );
};
