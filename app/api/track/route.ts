import { trackHandler } from '@/lib/server/handlers';

export const POST = (req: Request) => trackHandler(req);
