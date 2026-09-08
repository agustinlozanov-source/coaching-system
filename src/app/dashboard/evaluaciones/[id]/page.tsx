import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// El tablero es la vista/edición unificada por ahora.
export default function EvaluacionPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/evaluaciones/${params.id}/editar`);
}
