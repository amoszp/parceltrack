import { meHandler } from '@/lib/server/handlers';

export const dynamic = 'force-dynamic';
export const GET = (req: Request) => meHandler(req);
