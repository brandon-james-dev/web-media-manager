import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QuickEditField } from "./QuickEditField";
import { quickEditFields } from "./quickEditFields";
import type { EditableField, QuickEditFormProps } from "./QuickEditFormProps";
import type { Song } from "@/models";
import { Save } from "lucide-react";

export function QuickEditForm({ formId, songs, onApply }: QuickEditFormProps) {
  const [values, setValues] = useState<
    Partial<Record<EditableField, string | number>>
  >({});

  function handleQuickEditFormSubmit(
    event: React.SubmitEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    const updates = { ...values } as Partial<Song>;
    onApply(updates);
    setValues({});
  }

  return (
    <>
      <form
        id={formId || "quick-edit-form"}
        className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-0.5 w-full"
        onSubmit={handleQuickEditFormSubmit}
      >
        {quickEditFields.map((field) => (
          <QuickEditField
            key={field}
            field={field}
            songs={songs}
            value={values[field]}
            onChange={(v) =>
              setValues((prev) => ({
                ...prev,
                [field]: v,
              }))
            }
          />
        ))}
      </form>

      <div
        className={`flex justify-end mt-4 ${formId != undefined ? "hidden" : ""}`}
      >
        <Button
          type="submit"
          form={formId || "quick-edit-form"}
          className="bg-accent hover:bg-accent/70 text-white"
          variant="default"
        >
          <Save />
          Apply to {songs.length} songs
        </Button>
      </div>
    </>
  );
}
