'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { GoalCard, GoalDialog } from '@/components/goals';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { getGoals, createGoal, updateGoal, deleteGoal } from '@/actions/goals';
import type { Goal, GoalStatus } from '@/types';

// Order for displaying horizon tabs
const horizonOrder = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

function sortHorizons(horizons: string[]): string[] {
  return horizons.sort((a, b) => {
    const aIndex = horizonOrder.indexOf(a);
    const bIndex = horizonOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [activeHorizon, setActiveHorizon] = useState<string | 'all'>('all');

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    const data = await getGoals();
    setGoals(data);
  };

  useRealtimeSync(['goals'], loadGoals);

  // Get unique horizons that have active goals
  const activeHorizons = sortHorizons(
    [...new Set(goals.filter(g => g.status === 'active').map(g => g.horizon))]
  );

  // All horizons (for dialog dropdown)
  const allHorizons = [...new Set(goals.map(g => g.horizon))];

  // Filter goals by active horizon
  const filteredGoals = activeHorizon === 'all'
    ? goals.filter(g => g.status === 'active')
    : goals.filter(g => g.horizon === activeHorizon && g.status === 'active');

  const handleSave = async (data: {
    title: string;
    description: string;
    horizon: string;
    status?: GoalStatus;
  }) => {
    if (editingGoal) {
      await updateGoal(editingGoal.id, data);
      setGoals(prev =>
        prev.map(g => (g.id === editingGoal.id ? { ...g, ...data } : g))
      );
    } else {
      const newGoal = await createGoal(data);
      setGoals(prev => [...prev, newGoal]);
      // Switch to the new goal's horizon
      setActiveHorizon(data.horizon);
    }
    setDialogOpen(false);
    setEditingGoal(null);
  };

  const handleDelete = async () => {
    if (editingGoal) {
      await deleteGoal(editingGoal.id);
      setGoals(prev => prev.filter(g => g.id !== editingGoal.id));
      setDialogOpen(false);
      setEditingGoal(null);
    }
  };

  const handleNewGoal = () => {
    setEditingGoal(null);
    setDialogOpen(true);
  };

  const handleGoalClick = (goal: Goal) => {
    setEditingGoal(goal);
    setDialogOpen(true);
  };

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Goals</h1>
        <Button onClick={handleNewGoal}>+ New Goal</Button>
      </div>

      {/* Horizon filter tabs - only show if there are goals */}
      {activeHorizons.length > 0 && (
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeHorizon === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveHorizon('all')}
          >
            All
          </Button>
          {activeHorizons.map(horizon => (
            <Button
              key={horizon}
              variant={activeHorizon === horizon ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveHorizon(horizon)}
              className="capitalize"
            >
              {horizon}
            </Button>
          ))}
        </div>
      )}

      {filteredGoals.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {goals.length === 0 ? (
            <p>No goals yet. Create your first goal to get started.</p>
          ) : (
            <p>No active goals for this time horizon.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onClick={() => handleGoalClick(goal)}
            />
          ))}
        </div>
      )}

      <GoalDialog
        goal={editingGoal}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingGoal(null);
        }}
        onSave={handleSave}
        onDelete={editingGoal ? handleDelete : undefined}
        existingHorizons={allHorizons}
      />
    </main>
  );
}
