"use client";
import { useState } from "react";
import { ApprovedReportsPresentation } from "@/presentation/reports/reports-view";
export function ReportsFixturePreview(){const [locale,setLocale]=useState<"ko"|"en">("ko");return <ApprovedReportsPresentation locale={locale} onLocaleChange={()=>setLocale(value=>value==="ko"?"en":"ko")}/>;}
