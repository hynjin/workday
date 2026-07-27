import { redirect } from "next/navigation";

export default function InboxCompatibilityPage() {
  redirect("/tasks?filter=inbox");
}
