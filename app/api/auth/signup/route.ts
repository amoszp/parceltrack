import { signupHandler } from '@/lib/server/handlers';

export const POST = (req: Request) => signupHandler(req);
