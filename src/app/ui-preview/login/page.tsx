import { ApprovedAuthPresentation } from "@/presentation/auth/auth-view";

export const dynamic = "force-static";

export default function LoginPreviewPage() {
  return <ApprovedAuthPresentation initialMode="login"/>;
}
