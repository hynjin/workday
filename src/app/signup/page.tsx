import { redirect } from "next/navigation";
import { ApprovedAuthPresentation } from "@/presentation/auth/auth-view";
import { authenticateProduct, changeProductLocale } from "@/adapters/product-ui-actions";
import { getOptionalUser } from "@/lib/auth";

export default async function SignupPage() {
  if(await getOptionalUser())redirect("/");
  return <ApprovedAuthPresentation initialMode="signup" navigationBasePath="" onAuthenticate={authenticateProduct} onLocaleChange={changeProductLocale}/>;
}
