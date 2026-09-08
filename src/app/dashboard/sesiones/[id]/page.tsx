import { SesionEditor } from '../_components/SesionEditor';

export const dynamic = 'force-dynamic';

export default function SesionDetallePage({ params }: { params: { id: string } }) {
  return <SesionEditor sesionId={params.id} />;
}
