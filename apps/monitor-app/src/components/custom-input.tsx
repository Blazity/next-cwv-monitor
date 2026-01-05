import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UseFormRegisterReturn, useFormState, Control, FieldValues, Path } from "react-hook-form";

type Props<T extends FieldValues> = {
  label?: string;
  registration: UseFormRegisterReturn<Path<T>>;
  control: Control<T>;
  "data-1p-ignore"?: boolean | "true" | "false";
} & React.ComponentProps<typeof Input>

export function CustomInput<T extends FieldValues>({
  label,
  placeholder,
  autoComplete = "off",
  "data-1p-ignore": data1pIgnore = "false",
  registration,
  control,
  ...props
}: Props<T>) {
  const { errors } = useFormState({ control });

  const error = errors[registration.name]?.message;
  const id = props.id ?? registration.name;

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Input
        id={id}
        placeholder={placeholder}
        autoComplete={autoComplete}
        data-1p-ignore={data1pIgnore}
        {...registration}
        {...props}
      />
      {typeof error === "string" && <p className="text-destructive text-xs font-medium">{error}</p>}
    </div>
  );
}
