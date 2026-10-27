import { loginHandler } from '@/lib/server/handlers';

export const POST = (req: Request) => loginHandler(req);
