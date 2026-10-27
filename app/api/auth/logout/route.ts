import { logoutHandler } from '@/lib/server/handlers';

export const POST = (req: Request) => logoutHandler(req);
