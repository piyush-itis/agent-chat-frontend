"use client";

import { Sidebar } from "@/components/chat/sidebar";
import { TasksBoard } from "@/components/chat/tasks-board";

export default function TasksPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <TasksBoard />
    </div>
  );
}
