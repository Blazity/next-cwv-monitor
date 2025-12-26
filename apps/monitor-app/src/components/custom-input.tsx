import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UseFormRegisterReturn, useFormState } from 'react-hook-form';

type Props = UseFormRegisterReturn &
  React.ComponentProps<typeof Input> & {
    label?: string;
    placeholder?: string;
    'data-1p-ignore'?: boolean | 'true' | 'false';
  };

export function CustomInput({
  label,
  placeholder,
  autoComplete = 'off',
  'data-1p-ignore': data1pIgnore = 'false',
  ...props
}: Props) {
  const { errors } = useFormState();
  const error = errors[props.name]?.message;
  const id = props.id ?? props.name;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} placeholder={placeholder} autoComplete={autoComplete} data-1p-ignore={data1pIgnore} {...props} />
      {typeof error === 'string' && <p className="text-red-500">{error}</p>}
    </div>
  );
}
