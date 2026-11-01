import * as React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import type { VariantProps } from "class-variance-authority";

type DropdownSide = "left" | "right" | "top" | "bottom";

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;

interface SplitButtonProps {
  label: string;
  buttonVariant?: ButtonVariant; // primary button variant; default: "default"
  buttonType?: "button" | "submit" | "reset"; // primary button type; default: "button"
  onPrimaryClick: () => void;
  menuItems: { label: React.ReactNode; onClick: () => void }[];
  dropdownSide?: DropdownSide; // default: "right"
  dropdownTriggerContent?: React.ReactNode; // custom content next to dropdown icon
}

export function SplitButton({
  label,
  buttonVariant = "default",
  buttonType = "button",
  onPrimaryClick,
  menuItems,
  dropdownSide = "right",
  dropdownTriggerContent = <ChevronDown className="h-4 w-4" />, // default icon
}: SplitButtonProps) {
  const isLeft = dropdownSide === "left";

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={(triggerProps) => (
            <Button
              variant="secondary"
              className={isLeft ? "rounded-r-none px-2" : "rounded-l-none px-2"}
              aria-label="More options"
              {...triggerProps}
            >
              {dropdownTriggerContent}
            </Button>
          )}
        />
        <DropdownMenuContent>
          {menuItems.map((item, idx) => (
            <DropdownMenuItem key={idx} onClick={item.onClick}>
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type={buttonType}
        onClick={onPrimaryClick}
        variant={buttonVariant}
        className={`${isLeft ? "rounded-l-none" : "rounded-r-none"}`}
      >
        <span>{label}</span>
      </Button>
    </div>
  );
}
