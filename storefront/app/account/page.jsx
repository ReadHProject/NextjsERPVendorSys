import { redirect } from "next/navigation";

export default function AccountIndexRedirect() {
  redirect("/account/dashboard");
}
