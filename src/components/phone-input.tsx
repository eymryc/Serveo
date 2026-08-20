"use client";

import IntlTelInput from "@intl-tel-input/react";
import "intl-tel-input/styles";
import { cn } from "@/lib/utils";

type PhoneInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  className?: string;
  "aria-invalid"?: boolean;
};

export function PhoneInput({
  id,
  value,
  onChange,
  required,
  autoComplete = "tel",
  className,
  "aria-invalid": ariaInvalid,
}: PhoneInputProps) {
  return (
    <IntlTelInput
      initialCountry="ci"
      separateDialCode
      value={value}
      onChangeNumber={onChange}
      loadUtils={() => import("intl-tel-input/utils")}
      containerClass={cn("phone-input w-full", className)}
      inputProps={{
        id,
        required,
        autoComplete,
        "aria-invalid": ariaInvalid,
        className: "phone-input-field",
      }}
    />
  );
}
