import { importHandler } from '@/lib/server/handlers';

export const POST = (req: Request) => importHandler(req);
