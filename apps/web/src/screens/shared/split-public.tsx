import { AppBar } from '@/frame/app-bar';
import { Screen } from '@/frame/screen';

/** `split-public` (screens.md). A stub until its B04 batch builds it. */
export default function Stub() {
  return (
    <Screen bar={<AppBar title="Split link" />}>
      <p className="px-4 pt-4 text-muted-foreground">Being built in B04.</p>
    </Screen>
  );
}
