import { ApprovedAuthPresentation } from "@/presentation/auth/auth-view";

export const dynamic = "force-static";

export default function SignupPreviewPage() {
  return <ApprovedAuthPresentation initialMode="signup"/>;
}
