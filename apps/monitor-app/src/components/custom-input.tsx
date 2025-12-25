import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UseFormRegisterReturn, useFormState } from 'react-hook-form';

type Props = UseFormRegisterReturn &
  React.ComponentProps<typeof Input> & {
    label?: string;
    placeholder?: string;
  };

export function CustomInput({ label, placeholder, ...props }: Props) {
  const { errors } = useFormState();
  const error = errors[props.name]?.message;

  return (
    <div className="space-y-2">
      <Label htmlFor="email">{label}</Label>
      <Input id="email" type="email" placeholder={placeholder} {...props} />
      {typeof error === 'string' && <p className="text-red-500">{error}</p>}
    </div>
  );
}
