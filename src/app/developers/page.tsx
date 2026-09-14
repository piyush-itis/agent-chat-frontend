"use client";

import { Sidebar } from "@/components/chat/sidebar";
import { DevelopersBoard } from "@/components/chat/developers-board";

export default function DevelopersPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <DevelopersBoard />
    </div>
  );
}
