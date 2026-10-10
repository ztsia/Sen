import { Placeholder } from '../placeholder';
import { screenById } from '../registry';

// B03 builds this screen on made-up data; until then, the placeholder.
export default function Stub() {
  return <Placeholder screen={screenById.get('scan')!} />;
}
