import { TableroEditor } from '@/components/teamx/TableroEditor';

export const dynamic = 'force-dynamic';

export default function EditarEvaluacionPage({ params }: { params: { id: string } }) {
  return <TableroEditor evaluacionId={params.id} />;
}
