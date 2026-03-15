"use client";

import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants";

export function FabNewPrompt() {
  const router = useRouter();
  return (
    <button className="fab" onClick={() => router.push(ROUTES.newPrompt)} type="button">
      <span className="fab-plus">+</span>
      <span>Add Prompt</span>
    </button>
  );
}
