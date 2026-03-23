"use client";

import { useState } from "react";
import type { Id3FormValues } from "@/models";

export function useDirtyFields(initialValues: Id3FormValues) {
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  function markDirty(name: string, value?: any) {
    if (value !== undefined && name in initialValues) {
      if ((initialValues as any)[name] !== value) {
        setDirty((prev) => ({ ...prev, [name]: true }));
      }
    }
  }

  function resetField(
    name: keyof Id3FormValues,
    form: { setValue: (k: keyof Id3FormValues, v: any) => void },
  ) {
    const original = initialValues[name];
    form.setValue(name, original);

    setDirty((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function resetAllDirtyFields(
    form: { setValue: (k: keyof Id3FormValues, v: any) => void },
    resetAlbumArt: () => void,
  ) {
    const nextDirty = { ...dirty };

    for (const key in nextDirty) {
      const k = key as keyof Id3FormValues;
      form.setValue(k, initialValues[k]);
      delete nextDirty[key];
    }

    resetAlbumArt();
    setDirty({});
  }

  return {
    dirty,
    markDirty,
    resetField,
    resetAllDirtyFields,
  };
}
