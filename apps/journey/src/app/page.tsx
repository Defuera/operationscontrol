import { Board } from '@/components/kanban';
import { getTasks } from '@/actions/tasks';

export default async function Home() {
  const tasks = await getTasks();

  return (
    <main className="min-h-screen p-8">
      <Board initialTasks={tasks} />
    </main>
  );
}
