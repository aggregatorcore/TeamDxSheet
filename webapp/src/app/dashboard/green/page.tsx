import { redirect } from "next/navigation";

export default function GreenRedirect() {
  redirect("/dashboard?view=green");
}
