import { listOrdersHandler } from '@/lib/server/handlers';

export const dynamic = 'force-dynamic';
export const GET = (req: Request) => listOrdersHandler(req);
