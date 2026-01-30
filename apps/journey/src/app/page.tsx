import { Board } from '@/components/kanban';
import { getBoardTasks } from '@/actions/tasks';

export default async function Home() {
  const tasks = await getBoardTasks();

  return (
    <main className="min-h-screen p-8">
      <Board initialTasks={tasks} />
    </main>
  );
}
