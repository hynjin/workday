"use client";

import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { LocalBackupPrompt } from "@/components/local-backup-prompt";
import { PopoverCloser } from "@/components/popover-closer";
import { QuickAdd } from "@/components/quick-add";
import { RailCollapseController } from "@/components/rail-collapse-controller";
import { SessionKeeper } from "@/components/session-keeper";

type Option = { id:string; title:string; color:string };

export function LegacyProductTools({locale,projects,areas}:{locale:Locale;projects:Option[];areas:Option[]}) {
  const pathname=usePathname();
  if(pathname==="/") return <SessionKeeper/>;
  return <>
    <LocalBackupPrompt locale={locale}/>
    <SessionKeeper/>
    <PopoverCloser/>
    <RailCollapseController/>
    <KeyboardShortcuts locale={locale}/>
    <QuickAdd projects={projects} areas={areas} locale={locale}/>
  </>;
}
