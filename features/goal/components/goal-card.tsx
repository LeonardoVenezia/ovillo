"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProgressBar } from "@/features/projects/components/progress-bar";
import { es } from "@/messages/es";

import { clearYearlyGoal, setYearlyGoal } from "../actions";
import { GOAL_TARGET_MAX, GOAL_TARGET_MIN } from "../schemas";

/**
 * Tarjeta "Meta del año" (spec §5.14): ver el progreso, anotar o cambiar la
 * meta y quitarla. El progreso lo calcula el servidor (`done`); acá solo se
 * pide la mutación y se refresca para que el resumen y el hub queden al día.
 */

export function GoalCard({
  year,
  initialGoal,
  done,
}: {
  year: number;
  initialGoal: number | null;
  done: number;
}) {
  const [goal, setGoal] = useState(initialGoal);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const percent =
    goal !== null && goal > 0
      ? Math.min(100, Math.round((done / goal) * 100))
      : 0;
  const progressText =
    goal === null
      ? null
      : (done >= goal ? es.goal.goalReached : es.goal.goalProgress)
          .replace("{done}", String(done))
          .replace("{target}", String(goal))
          .replace("{year}", String(year));

  function save() {
    const target = Number(value);
    if (
      !Number.isInteger(target) ||
      target < GOAL_TARGET_MIN ||
      target > GOAL_TARGET_MAX
    ) {
      toast.error(es.goal.errors.targetRange);
      return;
    }

    startTransition(async () => {
      const result = await setYearlyGoal({ year, targetProjects: target });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setGoal(target);
      setEditing(false);
      toast.success(es.goal.saved);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await clearYearlyGoal(year);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setGoal(null);
      setEditing(false);
      toast.success(es.goal.removed);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{es.goal.goalTitle}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {editing ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
            data-testid="goal-form"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-target">{es.goal.targetLabel}</Label>
              <Input
                id="goal-target"
                type="number"
                inputMode="numeric"
                min={GOAL_TARGET_MIN}
                max={GOAL_TARGET_MAX}
                value={value}
                placeholder={es.goal.targetPlaceholder}
                className="max-w-32"
                onChange={(event) => setValue(event.target.value)}
                data-testid="goal-target"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? es.goal.saving : es.goal.save}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => setEditing(false)}
              >
                {es.goal.cancel}
              </Button>
            </div>
          </form>
        ) : goal === null ? (
          <>
            <p className="text-sm">{es.goal.goalNone}</p>
            <p className="text-muted-foreground text-xs">
              {es.goal.goalHint.replace("{year}", String(year))}
            </p>
            <div>
              <Button
                size="sm"
                onClick={() => {
                  setValue("");
                  setEditing(true);
                }}
                data-testid="goal-set"
              >
                {es.goal.setCta}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium" data-testid="goal-progress">
                {progressText}
              </p>
              <ProgressBar value={percent} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setValue(String(goal));
                  setEditing(true);
                }}
                data-testid="goal-change"
              >
                {es.goal.changeCta}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={remove}
                data-testid="goal-remove"
              >
                {es.goal.removeCta}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
