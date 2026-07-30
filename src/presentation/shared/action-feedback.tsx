"use client";

import { useState } from "react";

export type ActionFeedbackLocale="ko"|"en";
export type ActionToastKind="archive"|"restore"|"delete";
type Toast={id:string;kind:ActionToastKind;name:string};

export function useActionToasts() {
  const [toasts,setToasts]=useState<Toast[]>([]);
  const notify=(kind:ActionToastKind,name:string)=>{
    const id=`${kind}-${Date.now()}-${Math.random()}`;
    setToasts(current=>[...current,{id,kind,name}]);
    window.setTimeout(()=>setToasts(current=>current.filter(toast=>toast.id!==id)),3500);
  };
  return {toasts,notify};
}

export function ActionToastStack({locale,toasts}:{locale:ActionFeedbackLocale;toasts:Toast[]}) {
  const message=(toast:Toast)=>{
    if(locale==="en")return toast.kind==="archive"?`Archived “${toast.name}”.`:toast.kind==="restore"?`Restored “${toast.name}”.`:`Deleted “${toast.name}”.`;
    return toast.kind==="archive"?`‘${toast.name}’을 보관했어요.`:toast.kind==="restore"?`‘${toast.name}’을 복원했어요.`:`‘${toast.name}’을 삭제했어요.`;
  };
  return <div className="focus-toast-stack" aria-live="polite" aria-atomic="false">{toasts.map(toast=><div className="focus-toast is-visible" role="status" key={toast.id}><span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg></span><div><strong>{toast.kind==="archive"?(locale==="ko"?"보관했어요":"Archived"):toast.kind==="restore"?(locale==="ko"?"복원했어요":"Restored"):(locale==="ko"?"삭제했어요":"Deleted")}</strong><small>{message(toast)}</small></div></div>)}</div>;
}

export function ConfirmDeleteDialog({locale,name,onCancel,onConfirm}:{locale:ActionFeedbackLocale;name:string;onCancel:()=>void;onConfirm:()=>void}) {
  return <div className="modal-layer"><button className="modal-backdrop" aria-label={locale==="ko"?"닫기":"Close"} onClick={onCancel}/><section className="modal confirm-delete-modal" role="alertdialog" aria-modal="true"><header><div><h2>{locale==="ko"?"삭제할까요?":"Delete this item?"}</h2><p>{locale==="ko"?`‘${name}’을 정말 삭제하시겠습니까?`:`Are you sure you want to delete “${name}”?`}</p></div></header><footer><button className="button subtle" type="button" onClick={onCancel}>{locale==="ko"?"취소":"Cancel"}</button><button className="button danger-confirm" type="button" onClick={onConfirm}>{locale==="ko"?"삭제":"Delete"}</button></footer></section></div>;
}
