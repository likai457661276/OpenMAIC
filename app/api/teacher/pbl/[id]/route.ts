import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { deletePBLProject, getPBLProject, updatePBLProject } from '@/lib/teacher/pbl-service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const project = await getPBLProject(id);
  if (!project) return apiError('INVALID_REQUEST', 404, 'PBL project not found');
  return apiSuccess({ project });
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const project = await updatePBLProject(id, await req.json());
    if (!project) return apiError('INVALID_REQUEST', 404, 'PBL project not found');
    return apiSuccess({ project });
  } catch (error) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Failed to update PBL project',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const deleted = await deletePBLProject(id);
  return apiSuccess({ deleted });
}
