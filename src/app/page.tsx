import { redirect } from "next/navigation";

// The root redirects to the main prompt library.
// Later we can add a dashboard or landing page here.
export default function HomePage() {
  redirect("/prompts");
}
