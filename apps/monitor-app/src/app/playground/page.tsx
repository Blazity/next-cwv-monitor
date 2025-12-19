import { Badge } from '@/components/badge';

// TODO: Remove before deploy, we can test here components
export default function PlaygroundPage() {
  return (
    <div>
      <h2>Badges</h2>
      <h3>Success - sm</h3>
      <div>
        <Badge defaultIcon size="sm" type="warning" label="Test" />
      </div>
    </div>
  );
}
