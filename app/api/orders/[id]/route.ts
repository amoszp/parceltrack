import { putOrderHandler, deleteOrderHandler } from '@/lib/server/handlers';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  return putOrderHandler(req, (await params).id);
}

export async function DELETE(req: Request, { params }: Ctx) {
  return deleteOrderHandler(req, (await params).id);
}
