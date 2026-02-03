import { Board } from '@/components/kanban';
import { getTasks } from '@/actions/tasks';
import { getProjects } from '@/actions/projects';

export default async function Home() {
  const [tasks, projects] = await Promise.all([getTasks(), getProjects()]);

  return (
    <main className="min-h-screen p-8">
      <Board initialTasks={tasks} projects={projects} />
    </main>
  );
}
